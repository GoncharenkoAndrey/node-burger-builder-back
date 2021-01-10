const environments = {
	staging:{
		httpPort: "3000",
		httpsPort: "3001",
		envName: "staging",
		hashingSecret: "thisIsASecret",
		maxChecks: 5,
		"twilio": {
			"accountSid": "",
			"authToken": "",
			"fromPhone": ""
		},
		templateGlobals: {
			"appName": "UptimeChecker",
			"companyName": "NotARealCompany, Inc",
			"yearCreated": "2018",
			"baseUrl": "http://localhost:3000"
		}
	},
	production: {
		httpPort: "5000",
		httpsPort: "5001",
		envName: "production",
		hashingSecret: "thisIsAlsoASecret",
		startPrice: 7,
		mysql: {
			host: "localhost",
			user: "root",
			password: '',
			database: "burger"
		},
		templateGlobals: {
			"appName": "UptimeChecker",
			"companyName": "NotARealCompany, Inc",
			"yearCreated": "2018",
			"baseUrl": "http://localhost:5000"
		}
	}
}
const currentEnvironment = typeof(process.env.NODE_ENV) == "string" ? process.env.NODE_ENV.toLowerCase() : 'staging';
const environmentToExport = environments[currentEnvironment];
module.exports = environmentToExport;