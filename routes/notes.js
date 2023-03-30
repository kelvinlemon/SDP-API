const { json } = require('express');
var express = require('express');
var router = express.Router();
require("dotenv").config();
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
	apiKey: process.env.OPEN_AI_KEY,
  });

const openai = new OpenAIApi(configuration);


function formatTime(){
	let time = new Date();
    var options = { 
        timeZone: 'Asia/Hong_Kong', 
        hour: 'numeric', 
        minute: 'numeric', 
        second: 'numeric',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    };
    time = time.toLocaleString('en-US', options);

	var parts = time.split(", ");
    var date = parts[0];
    var timestamp = parts[1];
	timestamp = timestamp.split(" ");
    var [hour, min, second] = timestamp[0].split(":");
    var [month, day, year] = date.split("/");
    month = parseInt(month) - 1;

	if (timestamp[1] == 'PM' && parseInt(hour) != 12){
		hour = parseInt(hour)+12;
	}

	hour = ''+hour;
	min = ''+min;
	second = ''+second;
	month = ''+month;
	date = ''+day;
	year = ''+year;

	var date2 = new Date(parseInt(year), parseInt(month)-1, parseInt(date)); // Month value is zero-based
	var options = { weekday: 'long' };
	var weekday = date2.toLocaleDateString('en-US', options);
	weekday = ''+weekday;

	
	if (hour.length < 2){
		hour = '0'+hour;
	}
	if (min.length < 2){
		min = '0'+min;
	}
	if (second.length < 2){
		second = '0'+second;
	}

	switch (weekday){
		case 'Monday':{
			weekday = 'Mon';
			break;
		}
		case 'Tuesday':{
			weekday = 'Tue';
			break;
		}
		case 'Wednesday':{
			weekday = 'Wed';
			break;
		}
		case 'Thursday':{
			weekday = 'Thur';
			break;
		}
		case 'Friday':{
			weekday = 'Fri';
			break;
		}
		case 'Saturday':{
			weekday = 'Sat';
			break;
		}
		case 'Sunday':{
			weekday = 'Sun';
			break;
		}
		default: break;
	}
	switch (month){
		case '0':{
			month = 'Jan';
			break;
		}
		case '1':{
			month = 'Feb';
			break;
		}
		case '2':{
			month = 'Mar';
			break;
		}
		case '3':{
			month = 'Apr';
			break;
		}
		case '4':{
			month = 'May';
			break;
		}
		case '5':{
			month = 'Jun';
			break;
		}
		case '6':{
			month = 'Jul';
			break;
		}
		case '7':{
			month = 'Aug';
			break;
		}
		case '8':{
			month = 'Sep';
			break;
		}
		case '9':{
			month = 'Oct';
			break;
		}
		case '10':{
			month = 'Nov';
			break;
		}
		case '11':{
			month = 'Dec';
			break;
		}
		default: break;
	}

	if (date < 10){
		date = "0" +date;
	}
	return `${hour}:${min}:${second} ${weekday} ${month} ${date} ${year}`;

}

function generateRandom16String() {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 16; i++) {
	  result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
  }

/* Restaurant signin ------------------------------------------------------*/
router.post('/rsignin', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var List = dbo.get('managerList');

	var username = req.body.name;
	var pwd = req.body.password;
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){			
		res.json("logined");
	}else if(username=='' || pwd==''){
		res.json("Username or password cannot be empty!");
	}else{
		List.find({managerName:username}).then((docs)=>{
			if (docs.length == 0){
				res.json("Login failure! Wrong username or password!");
			}
			else{
				if( pwd == docs[0]["password"]){
					var milliseconds = 60 * 30000;
					var loginSession = generateRandom16String();
					List.update({_id:docs[0]["_id"]},{$set:{loginCookies:loginSession}})
					res.header('Set-Cookie', 'loginSessionM='+loginSession +'; SameSite=None; Secure; maxAge: '+milliseconds);
					//req.session.userId = ''+docs[0]["_id"];
					//req.session.name = docs[0]['name'];	
					res.json("logined");
				}
				else{
					res.json("Login failure");
				}
			}
		}).catch((error) =>{
			res.json(error);
		});
	}

})

/* Restaurant logout ------------------------------------------------------*/
router.get('/rlogout', async (req, res) => {
	var dbo = req.db;
	var List = dbo.get('managerList');
	await List.update({loginCookies:req.cookies.loginSessionM},{$set:{loginCookies:'0'}})
	res.header('Set-Cookie', 'loginSessionM=; SameSite=None; Secure;');
	//req.session.userId = null;
	//req.session.name = null;
	res.json('Restaurant logouted');
});

/* "enable table" page ------------------------------------------------------*/
router.get('/enablepage', async (req, res) => {
	var db = req.db;
	var tableinfo = db.get('tableList');
	var List = db.get('managerList');
	var send = [];
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		tableinfo.find({}).then((docs)=>{
			for (let i = 0; i < docs.length; i ++){
				send.push({"table":docs[i]["table"], "status":docs[i]["status"]});
			}
			res.json(send);
		}).catch((error)=>{
			res.json(error);
		})
	}else{
		res.json('Not logined!');
	}
});

/* "enable" request ------------------------------------------------------*/
router.get('/enable/:table', async (req, res) => {

	var db = req.db;
	var tableinfo = db.get('tableList');
	var send = [];
	

	var table = req.params.table;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		if (parseInt(table) >= 1 && parseInt(table) <= 10){
			tableinfo.find({table:table}).then((docs)=>{
				if (docs[0]["status"] != "1" && docs[0] != ""){
					var random6Number = generateRandomNumberString();
					tableinfo.update({table:table},{$set:{orderedFood:"", time:formatTime(), status:"1", sessionCode: random6Number}}).then(()=>{
						send = [{"URL":'/toorder', "data":{"table":table,"session":random6Number}}];
						res.json(send);
					}).catch((error)=>{
						res.json(error);
					})
				}else{
					res.json({"AlreadyEnabledWithURL":'/toorder/'+docs[0]['table']+'/'+docs[0]['sessionCode']});
				}
			}).catch((error)=>{
				res.json(error);
			})
		}else{
			res.json("No this table!");
		}
	}else{
		res.json('Not logined!');
	}
});

/* "current order" page ------------------------------------------------------*/
router.get('/currentorderpage', async (req, res) => {
	var db = req.db;
	var tableinfo = db.get('tableList');
	var menu = db.get('menuList');
	var List = db.get('managerList');
	var send = [];
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		tableinfo.find({status:"1"}).then(async (docs)=>{		
			for (let i = 0; i < docs.length; i ++){
				var tableFood = docs[i]['orderedFood'].split(" ");
				var price = 0;
				if (tableFood[0] != ""){
					for (let j = 0; j < tableFood.length; j+=2){
						var food = await menu.find({_id:tableFood[j]}).catch((error)=>{res.json(error)});;
						price += parseInt(food[0]['price']) * parseInt(tableFood[j+1]);
					}
				}
				send.push({"tableId":docs[i]["_id"],"table":docs[i]["table"], "status":docs[i]["status"], "price":price});
			}
			res.json(send);
		}).catch((error)=>{
			res.json(error);
		})
	}else{
		res.json('Not logined!');
	}
});

/* "disable" request ------------------------------------------------------*/
router.delete('/disable/:table', express.urlencoded({ extended: true }), async (req, res) => {
	var db = req.db;
	var tableinfo = db.get('tableList');
	var history = db.get('historyList');
	var menu = db.get('menuList');

	var table = req.params.table;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		tableinfo.find({table:table}).then(async (docs)=>{
			if (docs[0]["status"] != "0"){
				var tableFood = docs[0]['orderedFood'].split(" ");
				var price = 0;
				if (tableFood[0] != "" &&  docs[0]['orderedFood'] != "undefined"){
					for (let j = 0; j < tableFood.length; j+=2){
						var food = await menu.find({_id:tableFood[j]}).catch((error)=>{res.json(error)});;
						price += parseInt(food[0]['price']) * parseInt(tableFood[j+1]);
					}
				}
				if (docs[0]["orderedFood"] != "" && docs[0]['orderedFood'] != "undefined"){
					history.insert({"table":docs[0]["table"], "orderedFood":docs[0]["orderedFood"], "time":docs[0]["time"], "totalPrice":''+price})
				}
				tableinfo.update({table:table},{$set:{orderedFood:"", time:"", status:"0", sessionCode:""}}).then(()=>{
					res.json('Disabled');
				}).catch((error)=>{
					res.json(error);
				})
			}else{
				res.json('Already in disable');
			}
		})
	}else{
		res.json('Not logined!');
	}
});

/* "click table" action ------------------------------------------------------*/
router.get('/clicktable/:table/', async (req, res) => {
    var db = req.db;
    var menuList = db.get('menuList');
	var tableinfo = db.get('tableList');
    var send= [];

    var table = req.params.table;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
    	var doc = await tableinfo.find({table:table});
		if (doc[0]['status'] != '0'){
			var orderData = doc[0]['orderedFood'].split(" ");
			for (let i = 0; i < orderData.length; i+=2){
				var docs2 = await menuList.find({_id:orderData[i]}).catch((error)=>{res.json(error)});
				if (!docs2 || orderData[i] == ""){
					continue;
				}
				send.push({"id":docs2[0]['_id'],"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "quantity":orderData[i+1]});
			}
			if (send.length != 0){
				res.json(send);
			}else{
				res.json('No food ordered yet!');
			}
		}else{
			res.json("Table "+ table +" is disabled!");
		}
	}else{
		res.json('Not logined!');
	}
});

/* "cancel order" action ------------------------------------------------------*/
router.delete('/cancelfood/:table/', express.urlencoded({ extended: true }), async (req, res) => {
    var db = req.db;
	var tableinfo = db.get('tableList');

    var table = req.params.table;
	var foodId = req.body.foodid;
	var quantity = req.body.quantity;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
    	var doc = await tableinfo.find({table:table});
		if (doc[0]['status'] != '0'){
			var orderData = doc[0]['orderedFood'].split(" ");
			if (orderData[0] != "" ){
				for (let i = 0; i < orderData.length; i+=2){
					if (orderData[i] == foodId){
						orderData[i+1] = ''+ (parseInt(orderData[i+1]) - parseInt(quantity));
						if (orderData[i+1] == 0){
							orderData.splice(i,2);
						}
					}
				}
				if (orderData[0] == "undefined"){
					var order = "";
				}else{				
					var order = ""+ orderData[0];
				}	
				for (let i = 1; i< orderData.length; i++){
					order = order+" "+orderData[i];
				}
				tableinfo.update({table:table},{$set:{orderedFood:order}}).then(()=>{
					if (orderData[0] == "undefined"){
						res.json("There is no order to cancel");
					}else{
						res.json(orderData);
					}
				}).catch((err)=>{
					res.send(err)
				})
			}else{
				res.json("There is no order");
			}
		}else{
			res.json("Table "+ table +" is disabled!");
		}
	}else{
		res.json('Not logined!');
	}
});

function searchHistory(docs, day, month, year){
	var filter1 = [];
	var filter2 = [];
	var filter3 = [];
	if (day != ""){
		if (parseInt(day) < 10){
			day = '0'+day;
		}
		for (let i =0; i < docs.length; i++){
			if (day == docs[i]["time"].split(" ")[3]){
				filter1.push(docs[i])
			}
		}
	}else{
		filter1 = docs;
	};
	if (month != ""){
		for (let i =0; i < filter1.length; i++){
			if (month == filter1[i]["time"].split(" ")[2]){
				filter2.push(filter1[i])
			}
		}
	}else if (day != ""){
		filter2 = filter1;
	}else{
		filter2 = docs;
	}

	if (year!= ""){
		for (let i =0; i < filter2.length; i++){
			if (year == filter2[i]["time"].split(" ")[4]){
				filter3.push(filter2[i])
			}
		}
	}
	if (filter3.length != 0 || year != ""){
		return filter3;
	}else if (filter2.length != 0 || month != ""){
		return filter2;
	}else{
		return filter1;
	}
	
};

/* "search" request ------------------------------------------------------*/
router.post('/search', express.urlencoded({ extended: true }), async (req, res) => {
	var db = req.db;
	var history = db.get('historyList');

	var day = req.body.day;
	var month = req.body.month;
	var year = req.body.year;

	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		history.find({}).then(async (docs)=>{
			if (day == "" && month =="" && year == ""){
				res.json(docs)
			}else{
				var send = searchHistory(docs, day, month, year);
				if (send.length == 0){
					res.json("There is not matched result");
				}else{
					res.json(send);
				}
			}	
		}).catch((err)=>{
			res.send(err);
		})
	}else{
		res.json('Not logined!');
	}
});

/* "click history table" action ------------------------------------------------------*/
router.get('/clickhistorytable/:historyid/', async (req, res) => {
    var db = req.db;
    var menuList = db.get('menuList');
	var history = db.get('historyList');
    var send= [];

    var id = req.params.historyid;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
    	var doc = await history.find({_id:id});
		if (!doc || doc.length == 0){
			res.json("history not found");
		}else{
			var orderData = doc[0]['orderedFood'].split(" ");
			for (let i = 0; i < orderData.length; i+=2){
				var docs2 = await menuList.find({_id:orderData[i]}).catch((error)=>{res.json(error)});
				if (!docs2 || orderData[i] == "" || docs2.length == 0){
					continue;
				}
				send.push({"id":docs2[0]['_id'],"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "quantity":orderData[i+1]});
			}
			res.json(send);
		}
	}else{
		res.json('Not logined!');
	}
});

/* "delete history" action ------------------------------------------------------*/
router.delete('/deletehistory/:historyid', async (req, res) => {
    var db = req.db;
    var history = db.get('historyList');

    var id = req.params.historyid;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		history.remove({_id:id}).then(()=>{
			res.json("history deleted");
		}).catch ((err)=>{
			res.json(err)
		})
	}else{
		res.json('Not logined!');
	}
});

/* "Add food" action ------------------------------------------------------*/
router.post('/addfood', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var menu = dbo.get('menuList');

	var type = req.body.type;
	var name = req.body.name;
	var description = req.body.description;
	var price = req.body.price;
	var foodClass = req.body.class;
	var style = req.body.style;
	var health = req.body.health;
	var set = req.body.set;
	var drink = req.body.drink;

	var List = dbo.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var isValid = true;
		for (var key in req.body) {
			if (!req.body[key] || req.body[key].trim() === '') {
				isValid = false;
				break;
			}
		}
		if (Object.keys(req.body).length != 9){
			isValid = false;
		}
		  
		if (!isValid){
			res.json('All data should be filled, cannot be empty!');
		}else{
			menu.insert({"foodName": name, "description": description, "price": price, "type":type, "style": style, "foodClass":foodClass, "healthTag": health, "set":set, "drink":drink}).then(()=>{
				res.json("Add success");
			}).catch((error)=>{
				res.json(error);
			});
		}
	}else{
		res.json('Not logined!');
	}
})

/* "delete food page" access ------------------------------------------------------*/
router.get('/deletepage', async (req, res) => {
    var db = req.db;
    var menu = db.get('menuList');
    var send= [];

	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		send = await menu.find({});
		res.json(send);
	}else{
		res.json("Not logined!");
	}
});

/* "delete menu food" action ------------------------------------------------------*/
router.delete('/deletefood/:foodid', async (req, res) => {
    var db = req.db;
    var menuList = db.get('menuList');

    var id = req.params.foodid;
	var List = db.get('managerList');
	var check = await List.find({loginCookies:req.cookies.loginSessionM});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		menuList.remove({_id:id}).then(()=>{
			res.json("food deleted");
		}).catch ((err)=>{
			res.json(err)
		})
	}else{
		res.json('Not logined!');
	}
});


function generateRandomNumberString() {
    let randomNumberString = '';
    for (let i = 0; i < 6; i++) {
      randomNumberString += Math.floor(Math.random() * 10);
    }
    return randomNumberString;
}

/* Customer signin ------------------------------------------------------*/
router.post('/csignin', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var List = dbo.get('userList');

	var username = req.body.name;
	var pwd = req.body.password;

	var check = await List.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){		
		res.json("logined");
	}else if(username=='' || pwd==''){
		res.json("Username or password cannot be empty!");
	}else{
		List.find({userName:username}).then((docs)=>{
			if (docs.length == 0){
				res.json("Login failure! Wrong username or password!");
			}
			else{
				if( pwd == docs[0]["password"]){
					var milliseconds = 60 * 30000;
					var loginSession = generateRandom16String();
					List.update({_id:docs[0]["_id"]},{$set:{loginCookies:loginSession}})
					res.setHeader('Set-Cookie', [
						'loginSessionU=' + loginSession + '; SameSite=None; Secure; maxAge: ' + milliseconds,
						'userId=' + docs[0]["_id"] + '; SameSite=None; Secure; maxAge: ' + milliseconds
					  ]);
					//req.session.userId = ''+docs[0]["_id"];
					//req.session.name = docs[0]['userName'];		
					res.json("logined");
				}
				else{
					res.json("Login failure");
				}
			}
		}).catch((error) =>{
			res.json(error);
		});
	}

})

/* Customer logout ------------------------------------------------------*/
router.get('/clogout', async (req, res) => {
	var dbo = req.db;
	var List = dbo.get('managerList');
	await List.update({loginCookies:req.cookies.loginSessionU},{$set:{loginCookies:'0'}})
	res.setHeader('Set-Cookie', [
		'loginSessionU=; SameSite=None; Secure;',
		'userId=; SameSite=None; Secure;'
	  ]);
	res.json('User logouted');
});


/* Customer registration ------------------------------------------------------*/
router.post('/register', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var List = dbo.get('userList');

	var username = req.body.name;
	var pwd = req.body.password;
	var role = req.body.role;


	var check = await List.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){		
		res.json("Already logined");
	}else if (username == "" || pwd == "" || role == ""){
		res.json("Username, password or role cannot be empty!");
	}else if(role != "student" && role != "worker"){
		res.json("Role must be student or worker only!");
	}else{
		List.find({userName:username}).then((docs)=>{
			if (docs.length == 0){
				List.insert({"userName": username, "password": pwd, "role": role}).then(()=>{
					res.json("Registration success");
				}).catch((error)=>{
					res.json(error);
				});
			}
			else{
				res.json("Username cannot be used!");
			}
		}).catch((error) =>{
			res.json(error);
		});
	}

});

/* Customer history ------------------------------------------------------*/
router.get('/chistory',async (req, res) => {
	var dbo = req.db;
	var userHistory = dbo.get('userHistoryList');
	var menuList = dbo.get('menuList');
	var send = [];
	var userList = dbo.get('userList');

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var userName = await userList.find({_id:req.cookies.userId});
		userHistory.find({userName:userName[0]['userName']}).then(async (docs)=>{
			for (let i = 0;i < docs.length; i++){
				var docs2 = await menuList.find({_id:docs[i]['history']}).catch((error)=>{res.json(error)});
				send.push({"id":docs2[0]['_id'],"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "time":docs[i]['time']});
			}
			res.json(send);
		}).catch((error)=>{res.json(error)});
	}else{
		res.json("Haven't login");
	}
});

function monthToInteger(month) {
	switch (month) {
	  case 'Jan': {
		month = '0';
		break;
	  }
	  case 'Feb': {
		month = '1';
		break;
	  }
	  case 'Mar': {
		month = '2';
		break;
	  }
	  case 'Apr': {
		month = '3';
		break;
	  }
	  case 'May': {
		month = '4';
		break;
	  }
	  case 'Jun': {
		month = '5';
		break;
	  }
	  case 'Jul': {
		month = '6';
		break;
	  }
	  case 'Aug': {
		month = '7';
		break;
	  }
	  case 'Sep': {
		month = '8';
		break;
	  }
	  case 'Oct': {
		month = '9';
		break;
	  }
	  case 'Nov': {
		month = '10';
		break;
	  }
	  case 'Dec': {
		month = '11';
		break;
	  }
	  default:
		break;
	}
	return parseInt(month);
  }
  
function filterDataByDate(data){
	var filter = [];
	let time = new Date();
	const currentYear = parseInt(''+time.getFullYear());
	const currentMonth = parseInt(''+time.getMonth());

	for (let i = 0; i < data.length; i++){
		if (currentMonth-2 < -1){
			if (monthToInteger(data[i]['time'].split(" ")[2]) == 11 && parseInt(data[i]['time'].split(" ")[4]) == currentYear-1){
				filter.push(data[i]);
			}
		}else{
			if (currentMonth-2 < monthToInteger(data[i]['time'].split(" ")[2]) && parseInt(data[i]['time'].split(" ")[4]) == currentYear){
				filter.push(data[i]);
			}
		}
	}
	return filter;
}

function percentageAnalysis(data){
	var totalCount = data.length;
	var counts = {};

	for (var i = 1; i <= 6; i++) {
		counts[i] = 0;
	}

	for (var j = 0; j < data.length; j++) {
		counts[parseInt(data[j])] += 1;
	}

	var percentages = [];

	for (var key in counts) {
		var percentage = ((counts[key] / totalCount) * 100).toFixed(2);
		percentages.push({value: key, percentage: percentage});
	}

	return percentages;
};

function lowestConsume(percentages){
	percentages.sort(function(a, b) {
		return a.percentage - b.percentage;
	});
	
	var lowestPercentage = percentages[0].percentage;
	var lowestPercentageValues = [];
	
	for (var k = 0; k < percentages.length; k++) {
		if (percentages[k].percentage === lowestPercentage) {
			lowestPercentageValues.push({"value":percentages[k].value, "percentage": percentages[k].percentage});
		}else{
			break;
		}
	}

	return lowestPercentageValues;
	  
}

function filterFoodByClass(menu, filter) {
	var filterMenu = [];

	for (let i = 0; i < menu.length; i++){
		for (let j = 0; j < filter.length; j++){
			if (menu[i].foodClass.includes(filter[j].value) && !menu[i].foodClass.includes("6")){
				filterMenu.push(menu[i]);
				break;
			}
		}
	}
	return filterMenu;
}

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}

/* "health recommend" action ------------------------------------------------------*/
router.get('/healthrecommend', async (req, res) => {
	var dbo = req.db;
	var userHistory = dbo.get('userHistoryList');
	var menuList = dbo.get('menuList');
	var userList = dbo.get('userList');
	var data = [];

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var userName = await userList.find({_id:req.cookies.userId});
		userHistory.find({userName:userName[0]['userName']}).then(async (docs)=>{
			for (let i = 0;i < docs.length; i++){
				var docs2 = await menuList.find({_id:docs[i]['history']}).catch((error)=>{res.json(error)});
				data.push({"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "time":docs[i]['time'], 
				"foodClass": docs2[0]['foodClass'], "healthTag":docs2[0]['healthTag'], "set":docs2[0]['set'], "drink":docs[0]['drink']});
			}
			if (data.length != 0){
				var analysisData = filterDataByDate(data);
				var foodClassData = [];
				for (let i = 0 ; i < analysisData.length; i++){
					foodClassData = foodClassData.concat(analysisData[i]['foodClass'].split(" "));
				} 
				var percentages = percentageAnalysis(foodClassData)
				var lowest = lowestConsume(percentages);
				var filter = filterFoodByClass(await menuList.find({}), lowest);
				var recommend = filter[getRandomInt(filter.length)]; // randomly select a food for the user according to what he eat less in the food pyramid
				res.json(recommend);
			}else{
				res.json("No history can make use to analysis!");
			}
		}).catch((error)=>{res.json(error)});
	}else{
		res.json("Haven't login");
	}
});

function filterByKey(data, key, keyValue){
	var filter = [];
	for (let i = 0; i < data.length; i++){
		if (data[i][key].includes(keyValue)){
			filter.push(data[i]);
		}
	}
	return filter;
}

/* "customized recommend" action ------------------------------------------------------*/
router.post('/customizerecommend', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var menu = dbo.get('menuList');

	var userList = dbo.get('userList');

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){		
		var filter = await menu.find({});
		var tempLength = filter.length;
		for (var key in req.body) {
			if (key != 'price' && req.body[key]){
				filter = filterByKey(filter, key, req.body[key])
			}
		}
		for (let i = 0; i < filter.length; i++){
			if (parseInt(filter[i]['price']) > parseInt(req.body.price)){
				filter.splice(i ,1);
			}
		}
		if (filter.length!=0 && filter.length != tempLength){
			res.json(filter); 
		}else if (filter.length == tempLength){
			res.json("No filter applied!");
		}else{
			res.json("No food matched with filter!");
		}
			
	}else{
		res.json('Not logined!');
	}
})

/* "random recommend food" action ------------------------------------------------------*/
router.get('/randomrecommendfood', async (req, res) => {
	var dbo = req.db;
	var menuList = dbo.get('menuList');
	
	var userList = dbo.get('userList');

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var menu = await menuList.find({});
		var food = true;
		var recommend = [];
		while (food){
			recommend = menu[getRandomInt(menu.length)]; // randomly select a food
			if (recommend.drink != "Yes"){
				food = false;
			}
		}
		res.json(recommend);
	}else{
		res.json("Haven't login");
	}
});

/* "random recommend drink" action ------------------------------------------------------*/
router.get('/randomrecommenddrink', async (req, res) => {
	var dbo = req.db;
	var menuList = dbo.get('menuList');
	
	var userList = dbo.get('userList');

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var menu = await menuList.find({});
		var food = true;
		var recommend = [];
		while (food){
			recommend = menu[getRandomInt(menu.length)]; // randomly select a food
			if (recommend.drink != "No"){
				food = false;
			}
		}
		res.json(recommend);
	}else{
		res.json("Haven't login");
	}
});


/* "chart analysis" page ------------------------------------------------------*/
router.get('/chartanalysis', async (req, res) => {
	var dbo = req.db;
	var userHistory = dbo.get('userHistoryList');
	var menuList = dbo.get('menuList');
	var userList = dbo.get('userList');
	var data = [];
	

	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		var userName = await userList.find({_id:req.cookies.userId});
		userHistory.find({userName:userName[0]['userName']}).then(async (docs)=>{
			for (let i = 0;i < docs.length; i++){
				var docs2 = await menuList.find({_id:docs[i]['history']}).catch((error)=>{res.json(error)});
				data.push({"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "time":docs[i]['time'], 
				"foodClass": docs2[0]['foodClass'], "healthTag":docs2[0]['healthTag'], "set":docs2[0]['set'], "drink":docs[0]['drink']});
			}
			if (data.length != 0){
				var analysisData = filterDataByDate(data);
				var foodClassData = [];
				for (let i = 0 ; i < analysisData.length; i++){
					foodClassData = foodClassData.concat(analysisData[i]['foodClass'].split(" "));
				} 
				var percentages = percentageAnalysis(foodClassData)
				res.json(percentages);
			}else{
				res.json("No history can make use to analysis!");
			}
		}).catch((error)=>{res.json(error)});
	}else{
		res.json("Haven't login");
	}
});

/* "Customer add history" action ------------------------------------------------------*/
router.post('/addcustomerhistory', express.urlencoded({ extended: true }), async (req, res) => {
	var dbo = req.db;
	var userHistory = dbo.get('userHistoryList');
	var menuList = dbo.get('menuList');
	var userList = dbo.get('userList');

	var foodId = req.body.foodid;
	var isValid = true;
	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		for (var key in req.body) {
			if (!req.body[key] || req.body[key].trim() === '') {
				isValid = false;
				break;
			}
		}
		if (Object.keys(req.body).length != 1){
			isValid = false;
		}

		if (foodId.length != 24){
			isValid = false;
		}
		if (isValid){
			var foodFind = await menuList.find({_id:foodId});
			if (foodFind.length != 0){
				var userName = await userList.find({_id:req.cookies.userId});
				userHistory.insert({"userName":userName[0]['userName'], "history":foodId, "time":formatTime()}).then(()=>{
					res.json("Customer history added");
				}).catch((error)=>{res.json(error)});
			}else{
				res.json('Invalid food ID!');
			};
		}else{
			res.json("foodid cannot be empty! or foodid need to with 24char!");
		}
	}else{
		res.json("Haven't login, can't add customer history");
	}
});


/* "Customer delete history" action ------------------------------------------------------*/
router.delete('/deletecustomerhistory/:historyid', express.urlencoded({ extended: true }), async (req, res) => {
    var db = req.db;
    var history = db.get('userHistoryList');

    var id = req.params.historyid;
	var userList = db.get('userList');
	var check = await userList.find({loginCookies:req.cookies.loginSessionU});

	if (check.length != 0 && check[0]['loginCookies'] != '0'){	
		history.remove({_id:id}).then(()=>{
			res.json("history deleted");
		}).catch ((err)=>{
			res.json(err)
		})
	}else{
		res.json('Not logined!');
	}
});

/* "Open AI health suggestion" action ------------------------------------------------------*/
router.post("/askhealthquestion", express.urlencoded({ extended: true }), async (req, res) => {
	try {
	  var question=req.body.question;
	  const response = await openai.createChatCompletion({
		  model: "gpt-3.5-turbo",
		  messages: [{ "role": "user", "content": 'Act as a AI health assistant, if the following question is not about health just reply me "Not a health question!:" '+question }],
		})
  
	  return res.status(200).json({
		success: true,
		data: response.data.choices[0].message.content,
	  });
	} catch (error) {
	  return res.status(400).json({
		success: false,
		error: error.response
		  ? error.response.data
		  : "There was an issue on the server",
	  });
	}
  });

/*function getUniqueTypes(data) {
	const types = new Set();
	const uniqueTypes = [];
	for (let i = 0; i < data.length; i++) {
	  if (!types.has(data[i].type)) {
		types.add(data[i].type);
		uniqueTypes.push(data[i].type);
	  }
	}
	return uniqueTypes;
}*/

/* "To order" page data ------------------------------------------------------*/
router.post('/toorder', express.urlencoded({ extended: true }), async (req, res) => {
    var db = req.db;
    var menu = db.get('menuList');
	var tableinfo = db.get('tableList');
    var send= [];
	if (req.body.length == 2){
    	var table = req.body.table;
		var session = req.body.session;
	}else{
		var table = req.cookies.table;
		var session = req.cookies.session;
	}
	
    var doc = await tableinfo.find({table:table});
	if (doc[0]['status'] != '0'){
		send = await menu.find({});
		var milliseconds = 28800000; //8hours
		res.setHeader('Set-Cookie', [
			'session=' + session + '; SameSite=None; Secure; maxAge: ' + milliseconds,
			'table=' + table + '; SameSite=None; Secure; maxAge: ' + milliseconds
		  ]);
		res.json(send);
	}else{
		res.json("Table "+ table +" is disabled!");
	}
});


/* "Ordered" page data ------------------------------------------------------*/
router.get('/ordered', async (req, res) => {
    var db = req.db;
    var menuList = db.get('menuList');
	var tableinfo = db.get('tableList');
    var send= [];

    var table = req.cookies.table;
	var session = req.cookies.session;
	
    var doc = await tableinfo.find({table:table});
	if (doc[0]['status'] != '0' && doc[0]['sessionCode'] == session){
		var isValid= true;
		if (!doc[0]['orderedFood'] || doc[0]['orderedFood'].trim() === '' || doc[0]['orderedFood'] == "undefined") {
			isValid = false;
		}
		if (isValid){
			var orderData = doc[0]['orderedFood'].split(" ");
			for (let i = 0; i < orderData.length; i+=2){
				var docs2 = await menuList.find({_id:orderData[i]}).catch((error)=>{res.json(error)});
				if (!docs2 || orderData[i] == ""){
					continue;
				}
				send.push({"id":docs2[0]['_id'],"foodName":docs2[0]['foodName'], "description":docs2[0]['description'],"Price":docs2[0]['price'], "quantity":orderData[i+1]});
			}
			if (send.length != 0){
				res.json(send);
			}else{
				res.json("No ordered food");
			}
		}else{
			res.json("No ordered food");
		}
	}else{
		res.json("Table "+ table +" is disabled or sessionCode is invalid!");
	}
});

function foodAddArrange(docs, order){
	var newOrder = '';
	var returnOrder  = '';
	var orderAdd = order.split(" ");
	var originFood = docs.split(" ");

	for (let i = 0; i < orderAdd.length; i += 2){
		var add = false;
		for(let j = 0; j < originFood.length; j+=2){
			if (orderAdd[i] == originFood[j]){
				originFood[j+1] = parseInt(originFood[j+1]) + parseInt(orderAdd[i+1])
				add = true;
			}
		}
		if (add != true){
			if (newOrder == ''){
				newOrder = orderAdd[i] + ' ' + orderAdd[i+1];
			}else{
				newOrder = newOrder + ' ' + orderAdd[i] + ' ' + orderAdd[i+1];
			}
		}
	}

	returnOrder = originFood[0]+ ' ' + originFood[1];
	for (let i = 2; i < originFood.length; i+=2){
		returnOrder = returnOrder + ' ' + originFood[i] + ' ' +originFood[i+1];
	}
	if (newOrder != ''){
		returnOrder = returnOrder + ' ' + newOrder;
	}
	return returnOrder;

}

/* "Submit" request ------------------------------------------------------*/
router.post('/submit', express.urlencoded({ extended: true }), async (req, res) => {
    var db = req.db;
	var tableinfo = db.get('tableList');

	var order = req.body.order; // order data should be arrage like, data: {"order": "_id 1 _id 2"}
	
	var isValid = true;
	var table = req.cookies.table;
	var session = req.cookies.session;
	
    var doc = await tableinfo.find({table:table});
	if (doc[0]['status'] != '0' && doc[0]['sessionCode'] == session){
		for (var key in req.body) {
			if (!req.body[key] || req.body[key].trim() === '') {
				isValid = false;
				break;
			}
		}
		if (Object.keys(req.body).length != 1){
			isValid = false;
		}

		if (tableValidCheck[0]['table'] != table){
			isValid = false;
		}
		if (isValid){
			var doc = await tableinfo.find({table:table});
			if (doc[0]['status'] != '0'){
				if (doc[0]['orderedFood'] != ""){
					order = foodAddArrange(doc[0]["orderedFood"], order);
				}
				tableinfo.update({table:table},{$set:{orderedFood:order}}).then(()=>{
					res.json("submitted");
				}).catch((err)=>{
					res.send(err)
				})
			}else{
				res.json("Table "+ table +" is disabled!");
			}
		}else{
			res.json("Order can't be empty or table number is not valid!");
		}
	}else{
		res.json("session has expired! ");
	}
});

module.exports = router;
