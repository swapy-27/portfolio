import { PropsWithChildren } from "react";
import "./styles/Landing.css";

const Landing = ({ children }: PropsWithChildren) => {
  return (
    <>
      <div className="landing-section" id="landingDiv">
        <div className="landing-container">
          <div className="landing-intro">
            <h2>Hello! I'm</h2>
            <h1>
              SWAPNIL
              <br />
              <span>JAIN</span>
            </h1>
          </div>
          <div className="landing-info">
            <h2 className="landing-info-h2">
              <div className="landing-h2-1">Build</div>
              <div className="landing-h2-2">Scale</div>
            </h2>
            <h2>
              <div className="landing-h2-info">Distributed Systems</div>
              <div className="landing-h2-info-1">Agentic AI</div>
            </h2>
          </div>
        </div>
        {children}
      </div>
    </>
  );
};

export default Landing;
