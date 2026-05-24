import express from "express";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import {SocketEvent} from "./types/socket.js";
import { USER_CONNECTION_STATUS } from "./types/user.js";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()

const app = express()

app.use(express.json())

let clientUrl = process.env.CLIENT_URL || "*"
if (clientUrl.endsWith("/")) {
	clientUrl = clientUrl.slice(0, -1)
}

app.use(cors({
	origin: clientUrl,
	credentials: true
}))

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: clientUrl,
		methods: ["GET", "POST"]
	},
	maxHttpBufferSize: 1e8,
	pingTimeout: 60000,
})

let userSocketMap = []

// Function to get all users in a room
function getUsersInRoom(roomId) {
	return userSocketMap.filter((user) => user.roomId == roomId)
}

// Function to get room id by socket id
function getRoomId(socketId) {
	const user = userSocketMap.find((user) => user.socketId === socketId)
	const roomId = user ? user.roomId : undefined

	if (!roomId) {
		console.error("Room ID is undefined for socket ID:", socketId)
		return null
	}
	return roomId
}

function getUserBySocketId(socketId) {
	const user = userSocketMap.find((user) => user.socketId === socketId)
	if (!user) {
		console.error("User not found for socket ID:", socketId)
		return null
	}
	return user
}

io.on("connection", (socket) => {
	// Handle user actions
	socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
		// Check is username exist in the room
		const isUsernameExist = getUsersInRoom(roomId).filter(
			(u) => u.username === username
		)
		if (isUsernameExist.length > 0) {
			io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
			return
		}

		const user = {
			username,
			roomId,
			status: USER_CONNECTION_STATUS.ONLINE,
			cursorPosition: 0,
			typing: false,
			socketId: socket.id,
			currentFile: null,
		}
		userSocketMap.push(user)
		socket.join(roomId)
		socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })
		const users = getUsersInRoom(roomId)
		io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
	})

	socket.on("disconnecting", () => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.USER_DISCONNECTED, { user })
		userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
		socket.leave(roomId)
	})

	// Handle file actions
	socket.on(
		SocketEvent.SYNC_FILE_STRUCTURE,
		({ fileStructure, openFiles, activeFile, socketId }) => {
			io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
				fileStructure,
				openFiles,
				activeFile,
			})
		}
	)

	socket.on(
		SocketEvent.DIRECTORY_CREATED,
		({ parentDirId, newDirectory }) => {
			const roomId = getRoomId(socket.id)
			if (!roomId) return
			socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
				parentDirId,
				newDirectory,
			})
		}
	)

	socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
			dirId,
			children,
		})
	})

	socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
			dirId,
			newName,
		})
	})

	socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.DIRECTORY_DELETED, { dirId })
	})

	socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
	})

	socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
			fileId,
			newContent,
		})
	})

	socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
			fileId,
			newName,
		})
	})

	socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
	})

	// Handle user status
	socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
	})

	socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
	})

	// Handle chat actions
	socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.RECEIVE_MESSAGE, { message })
	})

	// Handle cursor position and selection
	socket.on(SocketEvent.TYPING_START, ({ cursorPosition, selectionStart, selectionEnd }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return {
					...user,
					typing: true,
					cursorPosition,
					selectionStart,
					selectionEnd
				}
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user })
	})

	socket.on(SocketEvent.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: false }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user })
	})

	// Handle cursor movement without typing
	socket.on(SocketEvent.CURSOR_MOVE, ({ cursorPosition, selectionStart, selectionEnd }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return {
					...user,
					cursorPosition,
					selectionStart,
					selectionEnd
				}
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.CURSOR_MOVE, { user })
	})

	socket.on(SocketEvent.REQUEST_DRAWING, () => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
	})

	socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
		socket.broadcast
			.to(socketId)
			.emit(SocketEvent.SYNC_DRAWING, { drawingData })
	})

	socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
			snapshot,
		})
	})
})

const executeCodeLocal = async (language, fileName, content, stdin) => {
	const tempDir = path.join(__dirname, "..", "temp")
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true })
	}

	const filePath = path.join(tempDir, fileName)
	fs.writeFileSync(filePath, content)

	let command = ""
	let args = []
	let isCompiled = false
	let outputBinary = ""

	const langLower = language.toLowerCase()
	if (langLower === "javascript" || langLower === "js") {
		command = "node"
		args = [filePath]
	} else if (langLower === "typescript" || langLower === "ts") {
		command = "npx"
		args = ["ts-node", filePath]
	} else if (langLower === "python" || langLower === "py") {
		command = "python"
		args = [filePath]
	} else if (langLower === "c") {
		isCompiled = true
		outputBinary = filePath.replace(/\.c$/, "") + (process.platform === "win32" ? ".exe" : "")
		command = "gcc"
		args = [filePath, "-o", outputBinary]
	} else if (langLower === "c++" || langLower === "cpp") {
		isCompiled = true
		outputBinary = filePath.replace(/\.(cpp|cc|cxx)$/, "") + (process.platform === "win32" ? ".exe" : "")
		command = "g++"
		args = [filePath, "-o", outputBinary]
	} else if (langLower === "rust" || langLower === "rs") {
		isCompiled = true
		outputBinary = filePath.replace(/\.rs$/, "") + (process.platform === "win32" ? ".exe" : "")
		command = "rustc"
		args = [filePath, "-o", outputBinary]
	} else if (langLower === "java") {
		isCompiled = true
		outputBinary = "__java__" // Special marker for Java
		command = "javac"
		args = [filePath]
	} else {
		try {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
		} catch (e) {}
		throw new Error(`Unsupported language for local execution: ${language}`)
	}

	// Helper to clean up temp files
	const cleanup = () => {
		try {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
		} catch (e) {}
		if (outputBinary === "__java__") {
			// Java: clean up .class file
			const classFile = filePath.replace(/\.java$/, ".class")
			try {
				if (fs.existsSync(classFile)) fs.unlinkSync(classFile)
			} catch (e) {}
		} else if (outputBinary) {
			try {
				if (fs.existsSync(outputBinary)) fs.unlinkSync(outputBinary)
			} catch (e) {}
		}
	}

	// For compiled languages: compile first, then run the binary
	if (isCompiled) {
		return new Promise((resolve) => {
			const compileChild = spawn(command, args, { shell: true })
			let compileStderr = ""

			compileChild.stderr.on("data", (data) => {
				compileStderr += data.toString()
			})

			const compileTimeout = setTimeout(() => {
				compileChild.kill()
				compileStderr += "\n[Compilation Timeout: Process terminated after 15 seconds]"
				cleanup()
				resolve({ stdout: "", stderr: compileStderr, code: -1 })
			}, 15000)

			compileChild.on("close", (compileCode) => {
				clearTimeout(compileTimeout)

				if (compileCode !== 0) {
					cleanup()
					return resolve({ stdout: "", stderr: compileStderr, code: compileCode })
				}

				// Compilation succeeded, now run the binary
				let runCommand, runArgs
				if (outputBinary === "__java__") {
					// Java: run with `java -cp <dir> <ClassName>`
					const className = path.basename(filePath, ".java")
					runCommand = "java"
					runArgs = ["-cp", path.dirname(filePath), className]
				} else {
					runCommand = outputBinary
					runArgs = []
				}
				const runChild = spawn(runCommand, runArgs, { shell: true })
				let stdout = ""
				let stderr = ""

				if (stdin && runChild.stdin) {
					runChild.stdin.write(stdin)
					runChild.stdin.end()
				}

				runChild.stdout.on("data", (data) => {
					stdout += data.toString()
				})

				runChild.stderr.on("data", (data) => {
					stderr += data.toString()
				})

				const runTimeout = setTimeout(() => {
					runChild.kill()
					stderr += "\n[Execution Timeout: Process terminated after 15 seconds]"
					cleanup()
					resolve({ stdout, stderr, code: -1 })
				}, 15000)

				runChild.on("close", (code) => {
					clearTimeout(runTimeout)
					cleanup()
					resolve({ stdout, stderr, code })
				})
			})
		})
	}

	// For interpreted languages: run directly
	return new Promise((resolve) => {
		const child = spawn(command, args, { shell: true })
		let stdout = ""
		let stderr = ""

		if (stdin && child.stdin) {
			child.stdin.write(stdin)
			child.stdin.end()
		}

		child.stdout.on("data", (data) => {
			stdout += data.toString()
		})

		child.stderr.on("data", (data) => {
			stderr += data.toString()
		})

		// Timeout mechanism to prevent infinite loops (15 seconds)
		const timeout = setTimeout(() => {
			child.kill()
			stderr += "\n[Execution Timeout: Process terminated after 15 seconds]"
			resolve({ stdout, stderr, code: -1 })
		}, 15000)

		child.on("close", (code) => {
			clearTimeout(timeout)
			cleanup()
			resolve({ stdout, stderr, code })
		})
	})
}

// Local Piston-compatible API endpoints
app.get("/api/v2/runtimes", (req, res) => {
	res.json([
		{
			language: "javascript",
			version: "NodeJS",
			aliases: ["js", "javascript"]
		},
		{
			language: "typescript",
			version: "TS-Node",
			aliases: ["ts", "typescript"]
		},
		{
			language: "python",
			version: "Python 3",
			aliases: ["py", "python3", "python"]
		},
		{
			language: "c",
			version: "GCC",
			aliases: ["c"]
		},
		{
			language: "c++",
			version: "G++",
			aliases: ["cpp", "cc", "cxx", "c++"]
		},
		{
			language: "rust",
			version: "Rustc",
			aliases: ["rs", "rust"]
		},
		{
			language: "java",
			version: "JDK",
			aliases: ["java"]
		}
	])
})

app.post("/api/v2/execute", async (req, res) => {
	try {
		const { language, files, stdin } = req.body
		if (!files || files.length === 0) {
			return res.status(400).json({ error: "No files provided" })
		}
		const activeFile = files[0]
		const result = await executeCodeLocal(language, activeFile.name, activeFile.content, stdin || "")
		res.json({
			run: {
				stdout: result.stdout,
				stderr: result.stderr,
				code: result.code,
				signal: null,
				output: result.stdout + result.stderr
			}
		})
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
})

app.get("/health", (req, res) => {
	res.json({ status: "ok" })
})

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "..", "client", "dist")))
	app.get("*all", (req, res) => {
		res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"))
	})
} else {
	app.get("/", (req, res) => {
		res.send("Code Sync API is running")
	})
}

const PORT = process.env.PORT || 3000

server.listen(PORT, "0.0.0.0", () => {
	console.log(`Listening on port ${PORT}`)
})
