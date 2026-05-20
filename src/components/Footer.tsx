import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <span>
              <span className="logo-comp">COMP</span>
              <span className="logo-x">X</span>
            </span>
          </div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#support">Contact Us</a>
          </div>
          <div className="socials">
            <a href="#">𝕏</a>
            <a href="#"></a>
            <a href="#"></a>
          </div>
        </div>
        <div className="copyright">
          &copy; 2026 CompX Leads Pro — Built for modern lead generation.
        </div>
      </div>
    </footer>
  );
}
