import { useEffect, useState } from "react"

function useWindowDimensions() {
    const [windowDimensions, setWindowDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    })
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [isTablet, setIsTablet] = useState(
        window.innerWidth >= 768 && window.innerWidth <= 1024
    )

    useEffect(() => {
        const updateWindowDimensions = () => {
            const w = window.innerWidth
            setWindowDimensions({
                width: w,
                height: window.innerHeight,
            })
            setIsMobile(w < 768)
            setIsTablet(w >= 768 && w <= 1024)
        }

        window.addEventListener("resize", updateWindowDimensions)

        return () => {
            window.removeEventListener("resize", updateWindowDimensions)
        }
    }, [])
    return { ...windowDimensions, isMobile, isTablet }
}

export default useWindowDimensions
