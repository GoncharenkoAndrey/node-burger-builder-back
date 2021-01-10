const mysql = require("mysql");
const argon2 = require("argon2");
const helpers = require("./helpers");
const config = require("./config");
const handlers = {
	notFound: function(data, callback){
		callback(404);
	}
};
handlers._ingredients = {
	get: function(data, callback){
		const databaseConnection = mysql.createConnection(config.mysql);
		let ingredientsQuery = "SELECT * FROM ingredients";
		databaseConnection.connect(function(error){
			if(!error){
				databaseConnection.query(ingredientsQuery, function(error, results, fields){
					if(!error && results.length){
						const ingredients = [];
						for(let i = 0;  i < results.length; i++){
							ingredients.push(results[i]);
						}
						databaseConnection.end();
						callback(200, ingredients);
					}
					else {
						databaseConnection.end();
						callback(500, {"Error" : "Could not get ingredients"});
					}
				});
			}
			else {
				callback(500, {"Error" : "Could not connect to database"});
			}
		});
	}
};
handlers._orders = {
	post: function(data, callback){
		const ingredients = typeof(data.payload.ingredients) == "object" && Object.keys(data.payload.ingredients).length > 0 ? data.payload.ingredients : false;
		const orderData = typeof(data.payload.orderData) == "object" && Object.keys(data.payload.orderData).length > 0 ? data.payload.orderData : false;
		if(ingredients && orderData){
			const databaseConnection = mysql.createConnection(config.mysql);
			databaseConnection.connect(function(error){
				if(!error){
					const ingredientNames = Object.keys(ingredients);
					const checkedIngredientNames = [];
					for(let i = 0; i < ingredientNames.length; i++){
						if(ingredients[ingredientNames[i]] > 0) {
							checkedIngredientNames.push(mysql.escape(ingredientNames[i]));
						}
					}
					let query = "INSERT INTO address (street, zipCode, country) VALUES(\""
						+ mysql.escape(orderData.street) + "\","
						+ mysql.escape(orderData.zipCode) + ",\""
						+ mysql.escape(orderData.country) +"\")";
					databaseConnection.query(query, function(error, results, fields){
						if(!error){
							const addressId = results.insertId;
							query = "INSERT INTO customers (name, email, address) VALUES(\""
								+ mysql.escape(orderData.name) + "\", \""
								+ mysql.escape(orderData.email) + "\","
								+ mysql.escape(addressId) +")";
							databaseConnection.query(query, function(error, results, fields){
								if(!error){
									const customerId = results.insertId;
									query = "INSERT INTO orders(deliveryMethod, customer) VALUES(\""
										+ mysql.escape(orderData.deliveryMethod) + "\","
										+ mysql.escape(customerId) + ")";
									databaseConnection.query(query, function(error, results, fields){
										if(!error) {
											const orderId = results.insertId;
											query = "SELECT id, name, price FROM ingredients WHERE name IN("
												+ checkedIngredientNames.join(",") + ")";
											databaseConnection.query(query, function(error, results, fields){
												if(!error){
													let insertError = false;
													const flags = [];
													for(let i = 0; i < results.length; i++){
														query = "INSERT INTO orderIngredients(ingredient, quantity, `order`) VALUES("
															+ results[i].id + ", " + mysql.escape(ingredients[results[i].name]) + ", " + orderId + ")";
														flags.push(results[i].id);
														databaseConnection.query(query, function(error, results, fields){
															if(error){
																insertError = true;
															}
															flags.pop();
															if(!flags.length){
																if(!insertError){
																	databaseConnection.end();
																	callback(200, {id: orderId});
																}
																else {
																	databaseConnection.end();
																	callback(500, "Could not save order content");
																}
															}
														}.bind([insertError, flags]));
													}
												}
											});
										}
										else {
											databaseConnection.end();
											callback(500, "Could not create order");
										}
									});
								}
								else {
									databaseConnection.end();
									callback(500, "Could not create customer");
								}
							});
						}
						else {
							databaseConnection.end();
							callback(500, "Could not create customer address");
						}
					});
				}
				else {
					callback(500, {"Error" : "Could not connect to database"});
				}
			});
		}
	},
	get: function(data, callback){
		const id = typeof(data.queryStringObject.id) == "string" && data.queryStringObject.id.trim().length > 0 ? data.queryStringObject.id.trim() : false;
		const token = typeof(data.queryStringObject.auth) == "string" ? data.queryStringObject.auth: false;
		helpers.verifyToken(token).then(tokenData => {
			let query = "SELECT id, deliveryMethod FROM orders WHERE customer = " + mysql.escape(tokenData.id);
			if(id){
				query += " AND id=" + mysql.escape(id);
			}
			else {
				const databaseConnection = mysql.createConnection(config.mysql);
				databaseConnection.connect(function(error){
					if(!error){
						databaseConnection.query(query, function(error, results, fields){
							if(!error){
								const orders = {};
								const flags = [];
								for(let i = 0; i < results.length; i++){
									const orderId = results[i].id;
									orders[orderId] = {
										id: results[i].id,
										deliveryMethod: results[i].deliveryMethod
									};
									orders[orderId].ingredients = {};
									orders[orderId].price = 4;
									query = "SELECT orderIngredients.quantity, orderIngredients.`order`, ingredients.name, ingredients.price FROM orderIngredients ";
									query += "INNER JOIN ingredients ON orderIngredients.ingredient = ingredients.id ";
									query += "WHERE orderIngredients.`order` = " + results[i].id;
									flags.push(orderId);
									databaseConnection.query(query, function(error, results, fields){
										for(let j = 0; j < results.length; j++) {
											orders[orderId].ingredients[results[j].name] = results[j].quantity;
											orders[orderId].price += results[j].price * results[j].quantity
										}
										flags.pop();
										if(!flags.length) {
											databaseConnection.end();
											callback(200, orders);
										}
									});
								}
							}
							else {
								databaseConnection.end();
								callback(500, "Could not get orders");
							}
						});
					}
					else {
						callback(500, {"Error" : "Could not connect to database"});
					}
				});
			}
		})
		.catch(error => {
			callback(401, {"Error" : error.message});
		});
	},
	options: function(data, callback){
		const headers = [
			{name: "Access-Control-Allow-Methods", value: "POST, GET"},
			{name: "Access-Control-Allow-Headers", value: "Content-Type"}
		];
		callback(200, null, "plain", headers);
	}
};
handlers._auth = {
	post: function(data, callback) {
		const email = typeof(data.payload.email) == "string" && data.payload.email.trim().length > 0 ? data.payload.email : false;
		const password = typeof(data.payload.password) == "string" && data.payload.password.trim().length > 6 ? data.payload.password : false;
		if(email, password) {
			const databaseConnection = mysql.createConnection(config.mysql);
			if(data.payload.isSignup){
				argon2.hash(password).then(function(hash){
					let userQuery = "INSERT INTO users(email, password) VALUES(" + mysql.escape(email) + ", "
						+ mysql.escape(hash) + ");";
					databaseConnection.query(userQuery, function(error, results, fields){
						if(!error){
							callback(200);
						}
						else {
							callback(500, {"Error" : "Could not create user"});
						}
					});
				});
			}
			else {
				userQuery = "SELECT * FROM users WHERE email="+ mysql.escape(data.payload.email) +";";
				databaseConnection.connect(function(error){
					if(!error){
						databaseConnection.query(userQuery, function(error, results, fields){
							if(!error && results.length){
								argon2.verify(results[0].password, password)
								.then(function(passwordCorrect){
									if(passwordCorrect) {
										helpers.generateToken(results[0]).then(function(tokenData){
											const userId = results[0].id;
											const tokenQuery = "UPDATE users SET token = " + mysql.escape(tokenData.token) + "WHERE id = " + results[0].id;
											databaseConnection.query(tokenQuery, function(error, results, fields){
												if(!error && results.changedRows) {
													const userData = {
														userId: userId,
														token: tokenData.token,
														expiresIn: tokenData.expiresIn
													};
													callback(200, userData);
												}
												else {
													callback("500", "Could not store token");
												}
												databaseConnection.end();
											});
											
										});
									}
									else {
										callback(403, {"Error" : "Incorrect password"});
									}
								});
							}
							else {
								databaseConnection.end();
								callback(400, {"Error" : "User not found"});
							}
						});
					}
				});
			}
		}
		else {
			callback(400, {"Error" : "Missing requred field"});
		}
	},
	options: function(data, callback){
		const headers = [
			{name: "Access-Control-Allow-Methods", value: "POST, GET"},
			{name: "Access-Control-Allow-Headers", value: "Content-Type"}
		];
		callback(200, null, "plain", headers);
	}
};
handlers.ingredients = function(data, callback){
	const acceptableMethods = ["get", "options"];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._ingredients[data.method](data, callback);
	}
	else {
		callback(405);
	}
};
handlers.orders = function(data, callback){
	const acceptableMethods = ["post", "get", "options"];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._orders[data.method](data, callback);
	}
	else {
		callback(405);
	}
};
handlers.auth = function(data, callback) {
	const acceptableMethods = ["post", "get", "options"];
	if(acceptableMethods.indexOf(data.method) > -1){
		handlers._auth[data.method](data, callback);
	}
	else {
		callback(405);
	}
}
module.exports = handlers;