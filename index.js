var express = require("express");
var app = express();
var db = require("./db");
var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
var cors = require("cors");
var moment = require("moment");

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

const staffQuery = date => { 
  const ans = `select * from dashboard.staff where DATEPART(mm,theDate)=${date.getUTCMonth() +
    1} and DATEPART(yy,theDate)=${date.getUTCFullYear()} and DATEPART(dd,theDate)=${date.getUTCDate()};`;
  console.log(ans);
  return ans;
};

app.get("/getStaff", function(req, res) {
  const request = db.request();
  request.query(staffQuery(new Date()), function(err, result) {
    // if (err) return next(err);

    var staffData = result.recordset;
    // console.log(data);
    // const overallData = overall(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(staffData);
  });
});

app.post("/setStaff", function(req, res) {
  console.log(req.body);
  const {
    theDate,
    full_pick,
    full_decoct,
    full_dis,
    part_pick,
    part_decoct
  } = req.body;
  const request = db.request();
  const date = new Date(theDate);
  console.log(date);
  request.query(staffQuery(date), function(err, result) {
    console.log(result);
    if (result.recordset.length === 0) {
      const addStaffData = `INSERT INTO staff VALUES ('${moment(date).format('YYYY-MM-DD HH:mm:ss')}',${full_pick},${full_decoct},${full_dis},${part_pick},${part_decoct});`;
      console.log(addStaffData);
      request.query(addStaffData, function(err, result) {
        // if (err) return next(err);

        // var staffData = result.recordset;
        // console.log(result);
        // console.log(data);
        // const overallData = overall(data);
        // // console.log(realTimeData);
        // res.send(realTimeData);
        console.log('add',result);
        res.send({ result });
      });
    } else {
      const updateStaffData = `UPDATE staff SET full_pick=${full_pick}, full_decoct=${full_decoct} , full_dis=${full_dis}  , part_pick=${part_pick},part_decoct=${part_decoct} where DATEPART(mm,theDate)=${date.getUTCMonth() +
        1} and DATEPART(yy,theDate)=${date.getUTCFullYear()} and DATEPART(dd,theDate)=${date.getUTCDate()};`;
      request.query(updateStaffData, function(err, result) {
        // if (err) return next(err);
        console.log('update');
        // var staffData = result.recordset;
        // console.log(data);
        // const overallData = overall(data);
        // // console.log(realTimeData);
        // res.send(realTimeData);
        res.send({ result });
      });
    }
  });
});

var server = app.listen(5000, function() {
  console.log("Server is running..");
});

// select CONVERT(varchar(11),ps_time),CONVERT(varchar(11),getdate()) from dbo.psrel P INNER JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id INNER JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time DESC ;
// select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P INNER JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id INNER JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time DESC ;
// select top 5000 CONVERT(varchar(11),ps_time),CONVERT(varchar(3),'MAR 10 2019'),P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(3),ps_time)=CONVERT(varchar(3),'Mar 10 2019') Order by ps_time  DESC;
