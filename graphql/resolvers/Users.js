const bcrypt = require("bcryptjs");
const { Prisma, prisma } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { withFilter } = require("apollo-server");

const { pubsub } = require("../../utils/pubsub");

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
					image_url: user.image_url,
					online: user.online,
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
						image_url: user.image_url,
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
					image_url: user.image_url,
					online: user.online,
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
		me: async (parent, args, { user, prisma }, info) => {
			if (!user) throw Error("Unauthenticated");

			const me = await prisma.users.findUnique({
				where: {
					id: parseInt(user.id),
				},
			});

			return {
				id: parseInt(me.id),
				email: me.email,
				username: me.username,
				userHandle: me.user_handle,
				image_url: me.image_url,
				online: me.online,
			};
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
						image_url:
							"https://firebasestorage.googleapis.com/v0/b/concord-6e42f.appspot.com/o/icons8-cat-profile-96.png?alt=media&token=ca420c46-36af-4c15-a6cd-58f20080c01d",
					},
				});
				console.log(new Date(newUser.createdate).toISOString());
				return {
					id: parseInt(newUser.id),
					email: newUser.email,
					username: newUser.username,
					userHandle: newUser.user_handle,
					createdate: new Date(newUser.createdate).toISOString(),
					image_url: newUser.image_url,
					online: newUser.online,
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

		updateOnlineStatus: async (
			parent,
			{ isOnline },
			{ prisma, user },
			info
		) => {
			if (!user) throw new Error("Unauthenticated");

			const u = await prisma.users.update({
				where: {
					id: parseInt(user.id),
				},
				data: {
					online: isOnline,
				},
			});

			pubsub.publish("USER_UPDATED_STATUS", {
				onUserUpdateOnlineStatus: {
					...u,
					id: parseInt(u.id),
					userHandle: u.user_handle,
				},
			});

			return {
				...u,
				id: parseInt(u.id),
				userHandle: u.user_handle,
			};
		},

		updateUser: async (
			parent,
			{ email, username, image },
			{ prisma, user },
			info
		) => {
			if (!user) throw new Error("Unauthenticated");

			if (email == "") email = undefined;
			if (username == "") username = undefined;

			try {
				const updatedUser = await prisma.users.update({
					where: {
						id: parseInt(user.id),
					},
					data: {
						email,
						username,
						image_url: image,
					},
				});

				return {
					id: parseInt(updatedUser.id),
					email: updatedUser.email,
					username: updatedUser.username,
					userHandle: updatedUser.userHandle,
					image_url: updatedUser.image_url,
					online: updatedUser.online,
				};
			} catch (err) {
				console.log(err);
				throw new Error("Internal server error");
			}
		},
	},

	Subscription: {
		onUserUpdateOnlineStatus: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(["USER_UPDATED_STATUS"]),
				(payload, variables) => {
					return (
						payload.onUserUpdateOnlineStatus.id == parseInt(variables.theUser)
					);
				}
			),
		},
	},
};
