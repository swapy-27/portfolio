import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Software Engineer II</h4>
                <h5>JPMorgan Chase</h5>
              </div>
              <h3>2025–NOW</h3>
            </div>
            <ul>
              <li>Built high-throughput recommendation and personalization platforms serving 70 million Chase customers</li>
              <li>Developed distributed streaming and big-data processing pipelines with Flink, Kafka, Spark, and EMR</li>
              <li>Built agentic AI systems with Ray-based model serving and incident triage agents</li>
              <li>Led multi-region migration and built cloud infrastructure with AWS, Terraform, and Kubernetes</li>
            </ul>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Senior Software Engineer</h4>
                <h5>Wells Fargo</h5>
              </div>
              <h3>2024–NOW</h3>
            </div>
            <ul>
              <li>Delivered the Managed Rates Engine for Wells Fargo's Enhanced Deposits Global Program in 11 weeks with zero defects</li>
              <li>Built EuclidPro, a configurable platform for workflow-driven API, messaging, and scheduled-job integrations</li>
              <li>Integrated Kafka, IBM MQ, and Hazelcast across scalable Kubernetes deployments on Azure</li>
            </ul>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Software Engineer</h4>
                <h5>HSBC</h5>
              </div>
              <h3>2021–24</h3>
            </div>
            <ul>
              <li>Migrated legacy payment systems to a scalable, maintainable microservices architecture</li>
              <li>Developed Apache Camel integration services for message transformation, routing, and validation</li>
              <li>Built reusable integration frameworks supporting Kafka, IBM MQ, and REST APIs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
