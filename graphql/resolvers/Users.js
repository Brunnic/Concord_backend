const bcrypt = require("bcryptjs");
const { Prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const INVALID_CREDENTIALS = "invalid_credentials";
class InvalidCredentialsError extends Error {
	constructor(message) {
		super("Invalid Credentials");
		this.name = INVALID_CREDENTIALS;
	}
}

module.exports = {
	Query: {
		user: async (parent, { id }, { prisma }, info) => {
			try {
				const user = await prisma.users.findUnique({
					where: {
						id: parseInt(id),
					},
				});

				if (!user) {
					throw new Error("No user found");
				}

				return {
					id: parseInt(user.id),
					email: user.email,
					username: user.username,
					userHandle: user.user_handle,
					createdate: user.createdate,
				};
			} catch (err) {
				if (err.message === "No user found") {
					throw err;
				}
				throw new Error("Internal server error");
			}
		},
		loginUser: async (parent, { email, password }, { prisma }, info) => {
			try {
				if (email === "" || password === "") {
					throw new Error("Fields should not be empty");
				}

				const user = await prisma.users.findUnique({
					where: {
						email,
					},
				});

				if (!user) {
					throw new InvalidCredentialsError();
				}

				const match = await bcrypt.compare(password, user.password);

				if (!match) {
					throw new InvalidCredentialsError();
				}

				const token = jwt.sign(
					{
						email,
						userHandle: user.user_handle,
						username: user.username,
						id: parseInt(user.id),
					},
					"JWT SECRET HERE",
					{
						expiresIn: "3d",
					}
				);

				return {
					id: parseInt(user.id),
					email: user.email,
					username: user.username,
					userHandle: user.user_handle,
					createdate: user.createdate,
					token,
				};
			} catch (err) {
				if (err.name === INVALID_CREDENTIALS) {
					throw err;
				}
				console.log(err);
				throw new Error("Internal server error");
			}
		},
		me: async (parent, args, { user }, info) => {
			if (!user) throw Error("Unauthenticated");

			return user;
		},
	},

	Mutation: {
		newUser: async (
			parent,
			{ data: { email, username, userHandle, password } },
			{ prisma },
			info
		) => {
			try {
				if (email === "" || username === "" || userHandle === "") {
					throw new Error("Fields should not be empty");
				}

				password = await bcrypt.hash(password, 6);
				const newUser = await prisma.users.create({
					data: {
						email,
						password,
						username,
						user_handle: userHandle,
						createdate: new Date(),
					},
				});
				console.log(new Date(newUser.createdate).toISOString());
				return {
					id: parseInt(newUser.id),
					email: newUser.email,
					username: newUser.username,
					userHandle: newUser.user_handle,
					createdate: new Date(newUser.createdate).toISOString(),
				};
			} catch (err) {
				if (err instanceof Prisma.PrismaClientKnownRequestError) {
					if (err.code === "P2002") {
						if (err.meta.target[0] === "email") {
							throw new Error("A user with this email already exists.");
						} else if (err.meta.target[0] === "user_handle") {
							throw new Error("User handle unavailable");
						}
					}
				}
				throw new Error("Internal server error");
			}
		},
	},
};
