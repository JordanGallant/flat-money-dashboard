import React from 'react'
import { FaGithub } from 'react-icons/fa'

export default function BottomDiv() {
  return (
    <div
        style={{
          textAlign: "center",
          marginTop: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        <span>Powered by </span>
        <div style={{ display: "inline-flex", alignItems: "center" }}>
          <a
            href="https://envio.dev/app/JordanGallant/silo-envio-demo-indexer"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline" }}
          >
            HyperIndex
          </a>
          <p style={{ margin: "0 4px" }}>on</p>
          <a
            href="https://envio.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://d30nibem0g3f7u.cloudfront.net/Envio-Logo.png"
              alt="Envio Logo"
              style={{ height: "20px", marginRight: "4px" }}
            />
          </a>
        </div>
        <a href="https://github.com/JordanGallant/event-density-template/tree/main" target="_blank" rel="noopener noreferrer">
          <FaGithub />
        </a>
      </div>
  )
}
