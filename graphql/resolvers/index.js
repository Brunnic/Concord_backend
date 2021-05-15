const Users = require("./Users");
const Friends = require("./Friends");
const Messages = require("./Messages");

module.exports = {
	Query: {
		...Users.Query,
		...Friends.Query,
		...Messages.Query,
	},
	Mutation: {
		...Users.Mutation,
		...Friends.Mutation,
		...Messages.Mutation,
	},
	Subscription: {
		...Messages.Subscription,
		...Friends.Subscription,
	},
};
