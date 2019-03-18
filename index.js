var express = require("express");
var app = express();
var db = require("./db");
var cors = require('cors')
var moment = require('moment')

app.use(cors({
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}))
const realtimeQuery =
  "select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time  DESC;";
const dateQuery = date => {
  if(date.getDate()>= 10) return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),'${moment(new Date('2019-02-25T09:36:44.198Z')).format('MMM DD YYYY')}') Order by ps_time  DESC;`
  else return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),'${moment(new Date('2019-05-06T09:36:44.198Z')).format('MMM  DD YYYY')}') Order by ps_time  DESC;`
}
  
const monthQuery = date => ``
const extractData = data => {
  let pick_q = [];
  let pick = [];
  let decoct_q = [];
  let decoct = [];
  let dispense_q = [];
  let dispense = [];
  let finish = [];
  let other = [];
  let staff_pick_act_full = 0;
  let staff_pick_act_part = 0;
  let staff_pick_act_cen = 0;
  let staff_decoct_act_full = 0;
  let staff_decoct_act_part = 0;

  const statusAllow = new Set([
    10,
    20,
    30,
    11,
    21,
    31,
    12,
    22,
    32,
    13,
    14,
    15,
    23,
    40,
    16,
    24,
    33,
    41
  ]);
  const setOfPreId = new Set();

  data = data.map(pre => {
    // console.log(pre.ps_time);
    if (!setOfPreId.has(pre.pre_id)) {
      setOfPreId.add(pre.pre_id);
      return pre;
    }
  });
  data = data.filter(pre => {
    return pre !== undefined;
  });

  console.log(data.length);
  data.forEach(prescription => {
    const {
      pre_id,
      s_id,
      ps_time,
      duration,
      numberOfOper,
      op_time,
      o_id,
      o_type,
      parttime
    } = prescription;
    if (s_id == 10 || s_id == 20 || s_id == 30) {
      const now = moment().add(7,"hours")
      prescription['time'] = now.diff(moment(prescription.ps_time), 'seconds');
      pick_q.push(prescription);
    }
    else if (s_id == 11 || s_id == 21 || s_id == 31) {
      pick.push(prescription);
    }

    else if (s_id == 12) {
      const now = moment().add(7,"hours")
      prescription['time'] = now.diff(moment(prescription.ps_time), 'seconds')
      decoct_q.push(prescription);
    }

    else if (s_id == 13) {
      decoct.push(prescription);
    }

    else if (s_id == 22 || s_id == 14) {
      const now = moment().add(7,"hours")
      prescription['time'] = now.diff(moment(prescription.ps_time), 'seconds')
      dispense_q.push(prescription);
    }

    else if (s_id == 32 || s_id == 15 || s_id == 23 || s_id == 40) {
      dispense.push(prescription);
    }

    else if (s_id == 16 || s_id == 24 || s_id == 33 || s_id == 41) {
      finish.push(prescription);
    }

    else other.push(prescription)
  });

  const result = {
    pick_q,
    pick,
    decoct_q,
    decoct,
    dispense_q,
    dispense,
    finish,
    other,
    sum:
      pick_q.length +
      pick.length +
      decoct_q.length +
      decoct.length +
      dispense_q.length +
      dispense.length +
      finish.length +
      other.length
  };

  // console.log('re',result);

  return result;
};


app.get("/realtime", function(req, res) {
  const request = db.request();
  request.query(realtimeQuery, function(err, result) {
    if (err) return next(err);

    var data = result.recordset;
    const realTimeData = extractData(data);
    // console.log(realTimeData);
    res.send(realTimeData);
  });
});

const dailyPicking = (data) => {
  const timeDict = {};
  const breakLimit = {};
  const avgTime = {};

  data.forEach(pre => {
    if(pre.s_id == 10 || pre.s_id == 20 || pre.s_id == 30){
      console.log(pre.ps_time,new Date(pre.ps_time).getMinutes(),new Date(pre.ps_time).getHours()-7);
      const temp = new Date(pre.ps_time)
      const h = temp.getHours()-7
      const m = temp.getMinutes()
      const duration = pre.duration
      if (avgTime[h]=== undefined) {
        avgTime[h] = {
          totalTime: duration,
          num: 1
        }
      }
      else{
        avgTime[h].totalTime += duration
        avgTime[h].num += 1
      }
      if(duration > 40){
        breakLimit[h] === undefined ? breakLimit[h] = 1 : breakLimit[h] += 1;
      }
      if(timeDict[h] === undefined)timeDict[h] = 1;
      else timeDict[h] += 1;
      if(m + duration >= 60) {
        for(let i = 1 ;i <= Math.floor((m+duration)/60);i++){
          timeDict[h + i] ++;
        }
      }
    }
  })

  return {
    timeDict,
    breakLimit,
    avgTime

  }
}
app.get('/dailyPicking', function (req, res) {
  const request = db.request();
  request.query(dateQuery(new Date()), function(err, result) {
    // if (err) return next(err);

    var data = result.recordset;
    console.log(data);
    const dailyPickingData = dailyPicking(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(dailyPickingData)
  });
})


app.get('/overallProcess', function (req, res) {
  const request = db.request();
  request.query(dateQuery(new Date()), function(err, result) {
    // if (err) return next(err);

    var data = result.recordset;
    console.log(data);
    const dailyPickingData = dailyPicking(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(dailyPickingData)
  });
})




var server = app.listen(5000, function() {
  console.log("Server is running..");
});

// select CONVERT(varchar(11),ps_time),CONVERT(varchar(11),getdate()) from dbo.psrel P INNER JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id INNER JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time DESC ;
// select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P INNER JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id INNER JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time DESC ;
// select top 5000 CONVERT(varchar(11),ps_time),CONVERT(varchar(3),'MAR 10 2019'),P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(3),ps_time)=CONVERT(varchar(3),'Mar 10 2019') Order by ps_time  DESC;