const jwt = require("jsonwebtoken");

module.exports = (ctx) => {
	if (ctx.req && ctx.req.headers.authorization) {
		const token = ctx.req.headers.authorization.split("Bearer ")[1];

		jwt.verify(token, "JWT SECRET HERE", (err, decodedToken) => {
			ctx.user = decodedToken;
		});
	}
	return ctx;
};
