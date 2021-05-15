const { PrismaClient } = require("@prisma/client");
const { ApolloServer } = require("apollo-server-express");
const express = require("express");
const http = require("http");

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const auth = require("./utils/auth");

const prisma = new PrismaClient();

async function startServer() {
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: (ctx) => {
			return {
				...auth(ctx),
				prisma,
			};
		},
		subscriptions: {
			path: "/subscriptions",
		},
	});

	const app = express();

	await server.start();

	server.applyMiddleware({ app });

	const httpServer = http.createServer(app);

	server.installSubscriptionHandlers(httpServer);

	const PORT = process.env.PORT || 4000;

	await new Promise((resolve) => httpServer.listen(PORT, resolve));
	console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
	console.log(
		`🚀 Subscriptions ready at ws://localhost:4000${server.subscriptionsPath}`
	);
	return { server, app, httpServer };
}

startServer();
