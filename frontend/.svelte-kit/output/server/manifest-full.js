export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.C06Ozy2Z.js",app:"_app/immutable/entry/app.fIAQBvZA.js",imports:["_app/immutable/entry/start.C06Ozy2Z.js","_app/immutable/chunks/DImjwblm.js","_app/immutable/chunks/CnglX5le.js","_app/immutable/chunks/Coj744v1.js","_app/immutable/chunks/BqiK9gpZ.js","_app/immutable/entry/app.fIAQBvZA.js","_app/immutable/chunks/CnglX5le.js","_app/immutable/chunks/8PFJ6ntA.js","_app/immutable/chunks/qhCaCgHc.js","_app/immutable/chunks/Dy2_i3Fl.js","_app/immutable/chunks/BCt3m0Z-.js","_app/immutable/chunks/reZitHEr.js","_app/immutable/chunks/D31U_0fv.js","_app/immutable/chunks/Coj744v1.js","_app/immutable/chunks/BqiK9gpZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/business",
				pattern: /^\/business\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: __memo(() => import('./entries/endpoints/business/_server.ts.js'))
			},
			{
				id: "/chat",
				pattern: /^\/chat\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/connect",
				pattern: /^\/connect\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/profile/[userId]",
				pattern: /^\/profile\/([^/]+?)\/?$/,
				params: [{"name":"userId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
