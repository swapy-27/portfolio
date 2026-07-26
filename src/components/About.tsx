import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">About Me</h3>
        <ul className="about-list">
          <li><span className="about-label">Now</span> — Software Engineer II at JPMorgan Chase, building high-throughput distributed systems</li>
          <li><span className="about-label">Focus</span> — Distributed streaming, big-data processing, agentic AI, and cloud infrastructure</li>
          <li><span className="about-label">Education</span> — B.Tech in Engineering from RGPV University</li>
        </ul>
      </div>
    </div>
  );
};

export default About;
