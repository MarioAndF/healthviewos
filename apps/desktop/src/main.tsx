import "../../web/src/browser-shims"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "../../web/src/index.css"
import "./desktop.css"

createRoot(document.getElementById("root")!).render(<App />)
