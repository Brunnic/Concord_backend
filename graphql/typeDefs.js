const { gql } = require("apollo-server");

module.exports = gql`
	type User {
		id: ID!
		email: String!
		username: String!
		userHandle: String!
		createdate: String
		token: String
	}
	type UserInfo {
		email: String!
		username: String!
		userHandle: String!
		token: String
	}
	type Message {
		id: Int!
		message: String!
		from_id: Int!
		to_id: Int!
	}
	type Query {
		user(id: ID!): User!
		loginUser(email: String!, password: String!): User!
		me: UserInfo!
		getFriends: [User!]!
		getConversations: [User]!
		searchFriend(userHandle: String!): [User]!
		getMessages(friend: ID!): [Message]!
	}
	type Mutation {
		newUser(data: NewUserInput): User!
		addFriend(friendHandle: String!): User!
		sendMessage(message: String!, to_id: Int!): Message!
	}
	type Subscription {
		newMessage(friend: ID!): Message!
	}

	input NewUserInput {
		email: String!
		username: String!
		userHandle: String!
		password: String!
	}
`;