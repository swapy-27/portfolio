export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  description: string;
  content: string;
  linkedinUrl?: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "first-weeks-as-inference-engineer",
    title: "What I Learned in My First Weeks as an Inference Engineer",
    date: "2026-10-25",
    description: "I built a local llama.cpp lab on my Mac to learn LLM inference from first principles. My first benchmark matched the theory and showed why token speed is a memory-bandwidth problem.",
    content: `
      <p>I recently moved into an inference engineering role. Before this, I was mostly on the consuming side of LLMs: send a prompt, get tokens back, move on. Then I had to explain why one setup generates 20 tokens per second and another generates 200, and I realized I did not have a real mental model for what happens inside the inference loop.</p>
      <p>So I did what I usually do when a topic feels fuzzy: I built a small lab and started measuring. I wrote a six-phase plan for myself — setup, first benchmarks, quantization and KV cache, sampling, serving latency, and speculative decoding — and started at the beginning. This is the first post in a series about what I am learning.</p>
      <p>The setup is intentionally simple: an Apple M4 with 16 GB of unified memory, llama.cpp built with Metal, and a few small GGUF models.</p>

      <h3>The one equation that explains almost everything</h3>
      <p>The idea that made the rest click: during token generation, the model is not doing a fixed amount of work per token. For every token it emits, it has to read the entire model — every weight — out of memory once. That makes decoding a <strong>memory-bandwidth problem</strong>, not a compute problem.</p>
      <pre>max tokens/sec ≈ memory bandwidth ÷ model size in bytes</pre>
      <p>A base M4 has about 120 GB/s of unified memory bandwidth. Qwen2.5-1.5B at Q4_K_M is roughly 0.98 GB on disk, so the ceiling is about 122 tokens per second. That is before scheduling overhead, sampling, memory stalls, or anything else.</p>
      <p>I wrote predictions down before running anything. A prediction you cannot miss is not a prediction:</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Model (Q4_K_M)</th><th>Weights</th><th>Predicted ceiling</th><th>Realistic guess</th></tr>
          </thead>
          <tbody>
            <tr><td>0.5B</td><td>~0.4 GB</td><td>~300 tok/s</td><td>100–180</td></tr>
            <tr><td>1.7B</td><td>~1.1 GB</td><td>~110 tok/s</td><td>50–80</td></tr>
            <tr><td>4B</td><td>~2.5 GB</td><td>~48 tok/s</td><td>25–35</td></tr>
            <tr><td>8B</td><td>~4.9 GB</td><td>~24 tok/s</td><td>12–18</td></tr>
          </tbody>
        </table>
      </div>
      <p>The 1.5B model I actually benchmarked sits between the 0.5B and 1.7B rows. The same math gives it a ceiling of about 122 tokens per second.</p>

      <h3>First measurement</h3>
      <p>I benchmarked Qwen2.5-1.5B-Instruct at Q4_K_M with llama-bench. It reports prefill (pp512 — processing a 512-token prompt) and decode (tg128 — generating 128 tokens) separately:</p>
      <pre>llama-bench -m models/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf -p 512 -n 128 -r 3 -ngl 99</pre>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Test</th><th>Result</th></tr>
          </thead>
          <tbody>
            <tr><td>Prefill pp512</td><td>1,053.5 ± 2.4 tok/s</td></tr>
            <tr><td>Decode tg128</td><td>86.8 ± 0.4 tok/s</td></tr>
          </tbody>
        </table>
      </div>
      <p>The result validated the model and humbled the guess. The measured decode speed — <strong>86.8 tokens per second</strong> — is about 71% of the theoretical bandwidth ceiling. I had predicted 50–80 as realistic, so the hardware beat my estimate; the ceiling still held.</p>
      <p>The more interesting number was prefill: <strong>1,053 tokens per second</strong>, more than 12× faster than decode. Prefill processes hundreds of tokens at once, so the same weights are reused across the batch. That is compute-bound work, and the GPU is good at it. For a single request, decode processes one token at a time, so it cannot amortize the weight reads. Every token pays the full memory bill again.</p>

      <h3>Why Metal only gave 1.35× on decode</h3>
      <p>I also ran the same model with the GPU disabled to see what Metal actually buys:</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Backend</th><th>Prefill pp512</th><th>Decode tg128</th></tr>
          </thead>
          <tbody>
            <tr><td>Metal (<code>-ngl 99</code>)</td><td>1,053.5 ± 2.4 tok/s</td><td>86.8 ± 0.4 tok/s</td></tr>
            <tr><td>CPU, GPU disabled (<code>-dev none</code>)</td><td>270.4 ± 1.2 tok/s</td><td>64.5 ± 2.1 tok/s</td></tr>
            <tr><td>Metal speedup</td><td>3.9×</td><td>1.35×</td></tr>
          </tbody>
        </table>
      </div>
      <p>Prefill got a 3.9× speedup. Decode got 1.35×. At first that is counterintuitive — the GPU is supposed to be the fast thing.</p>
      <p>It makes sense once you remember the bottleneck. Prefill is compute-heavy, so a GPU with thousands of execution units wins. Decode is memory-bound, and on Apple Silicon the CPU and GPU draw from the same unified memory pool. Moving work to the GPU does not create more bandwidth; it changes who is waiting on the same pipe. The GPU helps, but it cannot break the wall.</p>

      <h3>Long context is a RAM problem</h3>
      <p>The other piece is the KV cache. Every token already processed has to be remembered — keys and values for every layer and attention head — so the model can attend to it while generating the next token. Per token, the size is:</p>
      <pre>2 × layers × kv_heads × head_dim × bytes_per_element</pre>
      <p>For Llama-3.2-1B, that is roughly 32 KiB per token. At an 8k context window, that is 256 MiB of KV cache before the weights, activations, and runtime overhead. Double the context and it doubles again. This is why long-context inference is often a memory-capacity problem first and a compute problem second.</p>
      <p>Grouped-query attention exists partly to shrink that number: fewer key/value heads means less cache per token. Quantizing the KV cache — storing those values in 8 bits instead of 16 — is another lever. Same idea, applied to memory traffic instead of the weights.</p>

      <h3>What I am taking into the job</h3>
      <p>The useful shift is seeing every inference optimization as a way to reduce memory traffic:</p>
      <ul>
        <li><strong>Quantization</strong> shrinks the weights, so every decode step reads fewer bytes.</li>
        <li><strong>KV-cache quantization</strong> shrinks the per-token memory footprint, which buys context length.</li>
        <li><strong>Batching</strong> reuses one weight read across several requests, improving throughput at the cost of latency.</li>
        <li><strong>Speculative decoding</strong> uses a tiny draft model to propose tokens, then verifies several at once with the target model — turning several sequential memory-bound steps into one.</li>
      </ul>
      <p>None of these are magic. They trade memory traffic, compute, and latency against each other, and the equation tells you which side of the trade you are on.</p>

      <h3>What is next</h3>
      <p>The plan from here is to measure the rest instead of only reasoning about it: a quantization sweep from Q8 down to Q2, a context-length and KV-cache sweep, a concurrency test measuring time to first token and time per output token, and speculative decoding with a 0.5B draft model against the 1.5B target.</p>
      <p>I will write each one up the same way: what I predicted, what I measured, and why they differed. That loop is the actual skill I am trying to build.</p>
      <p>If you are also new to inference engineering — or you have been doing this for years and see something I got wrong — I would like to hear it.</p>
    `,
    linkedinUrl: undefined,
    tags: ["inference", "llama.cpp", "Apple Silicon", "LLM", "performance"],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
