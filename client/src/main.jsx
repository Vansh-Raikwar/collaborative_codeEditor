import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import AppProvider from "./context/AppProvider.jsx"
import "@/styles/global.css"

ReactDOM.createRoot(document.getElementById("root")).render(
    <AppProvider>
        <App />
    </AppProvider>,
    
)
