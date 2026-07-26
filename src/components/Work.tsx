import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./styles/Work.css";

const VIDEO_URL =
  "https://g1ctb3hnwvhw6s5v.public.blob.vercel-storage.com/how-it-works.mp4";

const Work = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isModalOpen, closeModal]);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          My <span>Work</span>
        </h2>

        <div className="carousel-wrapper">
          <div className="carousel-track-container">
            <div className="carousel-track">
              <div className="carousel-slide">
                <div className="carousel-content">
                  <div className="carousel-info">
                    <div className="carousel-details">
                      <h4>AI Infrastructure Cost Optimizer</h4>
                      <p className="carousel-category">AI Infrastructure / Cloud Cost</p>
                      <p className="carousel-description">
                        An AI-assisted platform integrated with Bitbucket pull
                        requests to analyze Terraform changes, recommend cloud
                        cost optimizations, and surface engineering best
                        practices before infrastructure reaches production.
                      </p>
                      <div className="carousel-tools">
                        <span className="tools-label">Tools & Stack</span>
                        <p>
                          Python, Terraform, AWS, Bitbucket, LLMs, Cloud Cost
                          Optimization
                        </p>
                      </div>
                      <a
                        href="#work"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="carousel-link"
                        data-cursor="disable"
                      >
                        Explore the project →
                      </a>
                    </div>
                  </div>
                  <div className="carousel-image-wrapper">
                    <div
                      className="video-card"
                      onClick={openModal}
                      data-cursor="disable"
                    >
                      <img
                        src="/videos/thumbnail.webp"
                        alt="AI Infrastructure Cost Optimizer project preview"
                        className="video-card-thumb"
                      />
                      <div className="video-card-overlay" />
                      <div className="video-card-play">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="white"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <div className="video-card-text">
                        <p className="video-card-title">
                          View the project concept
                        </p>
                        <p className="video-card-desc">
                          Watch a full incident investigation in 60 seconds
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen &&
        createPortal(
          <div className="video-modal" onClick={closeModal}>
            <div
              className="video-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="video-modal-close"
                onClick={closeModal}
                data-cursor="disable"
              >
                ✕
              </button>
              <video src={VIDEO_URL} autoPlay controls playsInline />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Work;
