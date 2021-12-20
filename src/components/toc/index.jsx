import React from "react"
import "./index.less"

const Toc = ({ toc = "" }) => {
  return (
    toc && <div className="css-toc">
      <div className="title">TOC</div>
      <div dangerouslySetInnerHTML={{ __html: toc }} />
    </div>
  )
}

export default Toc
