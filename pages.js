var express=  require("express");
var swig = require("swig");
var app = express();
var cookie = require("cookie-parser");
var http = require("http").Server(app);
var http_get= require("http");
var socket= require("socket.io")(http);
var socketHome = socket.of("debug");
socketHome.on("connection", (c)=>{

	attachUserInfo(c, (client)=>{
		client.on("disconnect",()=>{
			
			client.broadcast.emit("usergone", client.username);
		});

		client.on("position", (position)=>{
	
			//console.log("Longitude: "+ position.longitude + " Latitude: "+position.latitude);
			var opt = {
				host: "api.map.baidu.com",
				method: "get",
				path: "/ag/coord/convert?from=0&to=4&x="+position.longitude+"&y="+position.latitude
			};
			console.log(opt);
			var req = http_get.request(opt, (res)=>{
				res.on("data", (data)=>{
					console.log(client.username);
					var result = JSON.parse(data.toString());
					var msg = {
						user: client.username,
						longitude: new Buffer(result.x, "base64").toString(),
                                                latitude: new Buffer(result.y, "base64").toString()
					};
					client.emit("baidu_position", msg);
					client.broadcast.emit("baidu_position", msg);		
				});
			});
			req.on("error", (e)=>{
				console.log(e.toString());
			});
			req.end();		
		});

		
	});
});



function attachUserInfo(client, next){
	
	var headers = client.client.conn.request.rawHeaders;
	var step = -1;
	for(var i in headers){
		if(headers[i] == "Cookie"){
			step = parseInt(i)+1;
			break;	
		}
	}
	
	if(step >= headers.length || step == -1){
		client.close();
	}else{
		
		var cookies = headers[step].split(/heroId=|;/);
		console.log(cookies[1]);
		client.username=cookies[1];
		next(client);
	}
}

app.engine("html", swig.renderFile);
app.set("view engine", "html");
app.set("views", __dirname+"/views");
app.use("/js", express.static("js"));
app.use("/css", express.static("css"));
app.use("/img", express.static("img"));
app.use(cookie());
app.get("/test", (req, res)=>{
	console.log(req.cookies);
	res.render("test", {"user": req.cookies["heroId"]});
});
app.get("/login", (req, res)=>{
	res.render("login");
})

app.post("/login", (req,res)=>{
	req.on("data", (data)=>{
		var cred = JSON.parse(data.toString());
		if(cred.password == "1qaz2wsxE" && cred.username){
			res.writeHead(200, {
				'Set-Cookie':"heroId="+new Buffer(cred.username).toString("base64")+"; HttpOnly"
			});
			res.end("ok");
		}else{
			res.end("fail");
		}
	});
});
http.listen(9999);

