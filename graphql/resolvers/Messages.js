const { withFilter } = require("apollo-server");
const { pubsub } = require("../../utils/pubsub");
module.exports = {
	Query: {
		getMessages: async (parent, { friend }, { prisma, user }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const messages = await prisma.messages.findMany({
				where: {
					OR: [
						{
							from_id: parseInt(user.id),
							to_id: parseInt(friend),
						},
						{
							from_id: parseInt(friend),
							to_id: parseInt(user.id),
						},
					],
				},
			});

			return messages.map((m) => ({
				id: parseInt(m.id),
				from_id: parseInt(m.from_id),
				to_id: parseInt(m.to_id),
				message: m.message,
			}));
		},
	},

	Mutation: {
		sendMessage: async (parent, { message, to_id }, { prisma, user }, info) => {
			if (!user) throw new Error("Unauthenticated");

			const m = await prisma.messages.create({
				data: {
					from_id: user.id,
					to_id,
					message,
				},
			});

			pubsub.publish("MESSAGE_SENT", {
				newMessage: {
					id: parseInt(m.id),
					from_id: parseInt(m.from_id),
					to_id: parseInt(m.to_id),
					message: m.message,
				},
			});

			pubsub.publish("MESSAGE_RECEIVED", {
				receivedMessage: {
					...user,
					to_id,
				},
			});

			// const f = await prisma.friends.findMany({
			// 	where: {
			// 		OR: [
			// 			{
			// 				userid: parseInt(user.id),
			// 				friendid: parseInt(to_id),
			// 			},
			// 			{
			// 				userid: parseInt(to_id),
			// 				friendid: parseInt(user.id),
			// 			},
			// 		],
			// 	},
			// });

			// console.log(f);

			// if (!f || f.length < 0) {
			// 	await prisma.friends.create({
			// 		userid: parseInt(user.id),
			// 		friendid: parseInt(to_id),
			// 	});

			// 	await prisma.friends.create({
			// 		userid: parseInt(to_id),
			// 		friendid: parseInt(user.id),
			// 	});
			// }

			return {
				id: parseInt(m.id),
				from_id: parseInt(m.from_id),
				to_id: parseInt(m.to_id),
				message: m.message,
			};
		},
	},

	Subscription: {
		newMessage: {
			subscribe: withFilter(
				() => pubsub.asyncIterator(["MESSAGE_SENT"]),
				(payload, variables) => {
					return (
						payload.newMessage.from_id == parseInt(variables.friend) ||
						payload.newMessage.to_id == parseInt(variables.friend)
					);
				}
			),
		},
	},
};
