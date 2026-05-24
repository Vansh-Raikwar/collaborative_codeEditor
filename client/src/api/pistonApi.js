import axios from "axios"

const pistonBaseUrl = import.meta.env.VITE_PISTON_API_URL || "http://localhost:3000/api/v2"

const instance = axios.create({
    baseURL: pistonBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
})

export default instance
