import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSettings } from "@/context/SettingContext"
import { BiGitBranch } from "react-icons/bi"
import { VscCheckAll } from "react-icons/vsc"

function Statusbar() {
    const { activeFile } = useFileSystem()
    const { language } = useSettings()
    const { users } = useAppContext()

    // Retrieve active room name
    const path = window.location.pathname
    const roomId = path.split("/").pop() || "main"

    return (
        <footer className="statusbar select-none">
            <div className="status-item font-semibold">
                <BiGitBranch size={14} className="text-[#CECBF6]" />
                <span>main ({roomId.slice(0, 8)})</span>
            </div>
            <div className="status-item opacity-80">
                <VscCheckAll size={14} className="text-emerald-300" />
                <span>No issues</span>
            </div>

            <div className="status-right">
                {activeFile && (
                    <div className="status-item opacity-80">
                        <span>{activeFile.name}</span>
                    </div>
                )}
                <div className="status-item opacity-80">
                    <span>UTF-8</span>
                </div>
                <div className="status-item font-medium">
                    <span>{language}</span>
                </div>
                <div className="status-item opacity-80">
                    <span>{users.length} Collabs</span>
                </div>
            </div>
        </footer>
    )
}

export default Statusbar
