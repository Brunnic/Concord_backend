module.exports = {
	Query: {
		searchFriend: async (parent, { userHandle }, { user, prisma }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const users = await prisma.users.findMany({
				where: {
					user_handle: {
						contains: userHandle,
					},
				},
			});
			return users.map((u) => ({
				...u,
				id: parseInt(u.id),
				userHandle: u.user_handle
			}));
		},

		getFriends: async (parent, args, { user, prisma }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const theUser = await prisma.users.findUnique({
				where: {
					email: user.email,
				},
				include: {
					friends_friends_useridTousers: true,
				},
			});

			const friendsId = theUser.friends_friends_useridTousers;

			const getAllFriends = () => {
				return friendsId.map(async (f) => {
					let frien = await prisma.users.findUnique({
						where: {
							id: f.friendid,
						},
					});
					return {
						id: parseInt(frien.id),
						email: frien.email,
						username: frien.username,
						userHandle: frien.user_handle,
						createdate: frien.createdate,
					};
				});
			};

			return await getAllFriends();
		},

		getConversations: async (parent, args, { prisma, user }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const friendships = await prisma.friends.findMany({
				where: {
					OR: [
						{
							userid: parseInt(user.id)
						},
						{
							friendid: parseInt(user.id)
						}
					]
				}
			});

			const getAllConversations = () => {
				return friendships.map(async (f) => {
					let friend = (f.userid == user.id ? await prisma.users.findUnique({
						where: {
							id: f.friendid,
						},
					}) : await prisma.users.findUnique({
						where: {
							id: f.userid,
						},
					}))
					return {
						id: parseInt(friend.id),
						email: friend.email,
						username: friend.username,
						userHandle: friend.user_handle,
						createdate: friend.createdate,
					};
				});
			}

			return await getAllConversations();
		}
	},
	Mutation: {
		addFriend: async (parent, { friendHandle }, { user, prisma }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const theUser = await prisma.users.findUnique({
				where: {
					email: user.email,
				},
			});

			if (friendHandle === "") throw new Error("Please enter a user");

			const theFriend = await prisma.users.findUnique({
				where: {
					user_handle: friendHandle,
				},
			});

			if (!theFriend) throw new Error("User not found");

			await prisma.friends.create({
				data: {
					userid: parseInt(theUser.id),
					friendid: parseInt(theFriend.id),
				},
			});

			return theFriend;
		},
	},
};
