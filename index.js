var express = require("express");
var app = express();
var db = require("./db");

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
const realtimeQuery =
  "select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) Order by ps_time  DESC;";
const dateQuery = date => {
  if (date.getDate() >= 10)
    return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),'${moment(
      new Date(date)
    ).format("MMM DD YYYY")}') Order by ps_time  DESC;`;
  else
    return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),'${moment(
      new Date("date")
    ).format("MMM  DD YYYY")}') Order by ps_time  DESC;`;
};
const monthQuery = date => {
  return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE DATEPART(mm,ps_time)=${date.getUTCMonth() +
    1} and DATEPART(yy,ps_time)=${date.getUTCFullYear()} Order by ps_time  ASC;`;
};

const Time = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 0,
  16: 0,
  17: 0,
  18: 0,
  19: 0,
  20: 0,
  21: 0,
  22: 0,
  23: 0
};

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
      const now = moment().add(7, "hours");
      prescription["time"] = now.diff(moment(prescription.ps_time), "seconds");
      pick_q.push(prescription);
    } else if (s_id == 11 || s_id == 21 || s_id == 31) {
      pick.push(prescription);
    } else if (s_id == 12) {
      const now = moment().add(7, "hours");
      prescription["time"] = now.diff(moment(prescription.ps_time), "seconds");
      decoct_q.push(prescription);
    } else if (s_id == 13) {
      decoct.push(prescription);
    } else if (s_id == 22 || s_id == 14) {
      const now = moment().add(7, "hours");
      prescription["time"] = now.diff(moment(prescription.ps_time), "seconds");
      dispense_q.push(prescription);
    } else if (s_id == 32 || s_id == 15 || s_id == 23 || s_id == 40) {
      dispense.push(prescription);
    } else if (s_id == 16 || s_id == 24 || s_id == 33 || s_id == 41) {
      finish.push(prescription);
    } else other.push(prescription);
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

const dailyPicking = data => {
  const timeDict = { ...Time };
  const breakLimit = { ...Time };
  const avgTime = { ...Time };

  data.forEach(pre => {
    if (pre.s_id == 10 || pre.s_id == 20 || pre.s_id == 30) {
      console.log(
        pre.ps_time,
        new Date(pre.ps_time).getMinutes(),
        new Date(pre.ps_time).getHours() - 7
      );
      const temp = new Date(pre.ps_time);
      const h = temp.getUTCHours();
      const m = temp.getUTCMinutes();
      const duration = pre.duration;
      if (avgTime[h] === 0) {
        avgTime[h] = {
          totalTime: duration,
          num: 1
        };
      } else {
        avgTime[h].totalTime += duration;
        avgTime[h].num += 1;
      }
      if (duration > 40) {
        breakLimit[h] += 1;
      }
      if (timeDict[h] === undefined) timeDict[h] = 1;
      else timeDict[h] += 1;
      if (m + duration >= 60) {
        for (let i = 1; i <= Math.floor((m + duration) / 60); i++) {
          timeDict[h + 1]++;
        }
      }
    }
  });

  return {
    timeDict,
    breakLimit,
    avgTime
  };
};
app.post("/dailyPicking", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(dateQuery(date), function(err, result) {
    // if (err) return next(err);

    var data = result.recordset;
    // console.log(data);
    const dailyPickingData = dailyPicking(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(dailyPickingData);
  });
});

const dailyDecocting = data => {
  const timeDict = { ...Time };
  const breakLimit = { ...Time };
  const avgTime = { ...Time };

  data.forEach(pre => {
    if (pre.s_id == 12) {
      // console.log(pre);
      console.log(
        pre.ps_time,
        new Date(pre.ps_time).getMinutes(),
        new Date(pre.ps_time).getHours() - 7
      );
      const temp = new Date(pre.ps_time);
      const h = temp.getUTCHours();
      const m = temp.getUTCMinutes();
      const duration = pre.duration;
      if (avgTime[h] === 0) {
        avgTime[h] = {
          totalTime: duration,
          num: 1
        };
      } else {
        avgTime[h].totalTime += duration;
        avgTime[h].num += 1;
      }
      if (duration > 40) {
        console.log("earth", duration);
        breakLimit[h] += 1;
      }
      if (timeDict[h] === undefined) timeDict[h] = 1;
      else timeDict[h] += 1;
      if (m + duration >= 60) {
        for (
          let i = 1;
          i <= Math.floor((m + duration) / 60) && h + i <= 23;
          i++
        ) {
          timeDict[h + 1]++;
        }
      }
    }
  });

  return {
    timeDict,
    breakLimit,
    avgTime
  };
};

app.post("/dailyDecocting", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(dateQuery(date), function(err, result) {
    // if (err) return next(err);

    var data = result.recordset;
    // console.log(data);
    const dailyDecoctingData = dailyDecocting(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(dailyDecoctingData);
  });
});

const dailyDispense = data => {
  const timeDict = { ...Time };
  const breakLimit = { ...Time };
  const avgTime = { ...Time };

  data.forEach(pre => {
    if (pre.s_id == 14 || pre.s_id == 22) {
      // console.log(pre);
      // console.log(
      //   pre.ps_time,
      //   new Date(pre.ps_time).getMinutes(),
      //   new Date(pre.ps_time).getHours() - 7
      // );
      const temp = new Date(pre.ps_time);
      const h = temp.getUTCHours();
      const m = temp.getUTCMinutes();
      const duration = pre.duration;
      if (avgTime[h] === 0) {
        avgTime[h] = {
          totalTime: duration,
          num: 1
        };
      } else {
        console.log(pre);
        console.log(temp);
        avgTime[h].totalTime += duration;
        avgTime[h].num += 1;
      }
      if (duration > 40) {
        breakLimit[h] += 1;
      }
      if (timeDict[h] === undefined) timeDict[h] = 1;
      else timeDict[h] += 1;
      if (m + duration >= 60) {
        for (
          let i = 1;
          i <= Math.floor((m + duration) / 60) && h + i <= 23;
          i++
        ) {
          timeDict[h + 1]++;
        }
      }
    }
  });

  return {
    timeDict,
    breakLimit,
    avgTime
  };
};

app.post("/dailyDispense", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(dateQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const dailyDispenseData = dailyDispense(data);

    res.send(dailyDispenseData);
  });
});

const monthDict = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 0,
  16: 0,
  17: 0,
  18: 0,
  19: 0,
  20: 0,
  21: 0,
  22: 0,
  23: 0,
  24: 0,
  25: 0,
  26: 0,
  27: 0,
  28: 0,
  29: 0,
  30: 0,
  31: 0
};

const monthlyPicking = data => {
  dateDict = JSON.parse(JSON.stringify(monthDict));
  breakLimit = JSON.parse(JSON.stringify(monthDict));
  avgDate = JSON.parse(JSON.stringify(monthDict));

  data.forEach(pre => {
    if (pre.s_id == 10 || pre.s_id == 20 || pre.s_id == 30) {
      const date = new Date(pre.ps_time);
      const { duration } = pre;
      dateDict[date.getDate()]++;
      if (pre.duration > 50) {
        breakLimit[date.getDate()]++;
      }
      if (avgDate[date.getDate()] === 0) {
        avgDate[date.getDate()] = {
          totalTime: duration,
          num: 1
        };
      } else {
        avgDate[date.getDate()].totalTime += duration;
        avgDate[date.getDate()].num += 1;
      }
    }
  });

  return {
    dateDict,
    breakLimit,
    avgDate
  };
};

app.post("/monthlyPicking", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(monthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const monthlyPickingData = monthlyPicking(data);

    res.send(monthlyPickingData);
  });
});

const monthlyDecocting = data => {
  dateDict = JSON.parse(JSON.stringify(monthDict));
  breakLimit = JSON.parse(JSON.stringify(monthDict));
  avgDate = JSON.parse(JSON.stringify(monthDict));

  data.forEach(pre => {
    if (pre.s_id == 12) {
      const date = new Date(pre.ps_time);
      const { duration } = pre;
      dateDict[date.getDate()]++;
      if (pre.duration > 50) {
        breakLimit[date.getDate()]++;
      }
      if (avgDate[date.getDate()] === 0) {
        avgDate[date.getDate()] = {
          totalTime: duration,
          num: 1
        };
      } else {
        avgDate[date.getDate()].totalTime += duration;
        avgDate[date.getDate()].num += 1;
      }
    }
  });

  return {
    dateDict,
    breakLimit,
    avgDate
  };
};

app.post("/monthlyDecocting", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(monthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const monthlyDecoctingData = monthlyDecocting(data);

    res.send(monthlyDecoctingData);
  });
});

const monthlyDispense = data => {
  dateDict = JSON.parse(JSON.stringify(monthDict));
  breakLimit = JSON.parse(JSON.stringify(monthDict));
  avgDate = JSON.parse(JSON.stringify(monthDict));

  data.forEach(pre => {
    if (pre.s_id == 14 || pre.s_id == 22) {
      const date = new Date(pre.ps_time);
      const { duration } = pre;
      dateDict[date.getDate()]++;
      if (pre.duration > 50) {
        breakLimit[date.getDate()]++;
      }
      if (avgDate[date.getDate()] === 0) {
        avgDate[date.getDate()] = {
          totalTime: duration,
          num: 1
        };
      } else {
        avgDate[date.getDate()].totalTime += duration;
        avgDate[date.getDate()].num += 1;
      }
    }
  });

  return {
    dateDict,
    breakLimit,
    avgDate
  };
};

app.post("/monthlyDispense", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(monthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const monthlyDispenseData = monthlyDispense(data);

    res.send(monthlyDispenseData);
  });
});

const threeMonthQuery = date => {
  const m1 = moment(date).toDate();
  const m2 = moment(date)
    .subtract(1, "month")
    .toDate();
  const m3 = moment(date)
    .subtract(2, "month")
    .toDate();
  // console.log(m1.toDate(),m2.toDate(),m3.toDate());
  return `select P.pre_id,P.s_id,P.ps_time,P.duration,P.numberOfOper,O.op_time,O.o_id,OP.o_type,OP.parttime from dbo.psrel P LEFT JOIN dbo.oprel O ON P.pre_id = O.pre_id and P.s_id = O.s_id LEFT JOIN dbo.operator OP ON O.o_id = OP.o_id WHERE DATEPART(mm,ps_time)=${m1.getMonth() +
    1} and DATEPART(yy,ps_time)=${m1.getUTCFullYear()} or DATEPART(mm,ps_time)=${m2.getMonth() +
    1} and DATEPART(yy,ps_time)=${m2.getUTCFullYear()} or DATEPART(mm,ps_time)=${m3.getMonth() +
    1} and DATEPART(yy,ps_time)=${m3.getUTCFullYear()} Order by ps_time  ASC;`;
};

const threeMonthlyPicking = (data, date) => {
  const m1 = moment(date).toDate();
  const m2 = moment(date)
    .subtract(1, "month")
    .toDate();
  const m3 = moment(date)
    .subtract(2, "month")
    .toDate();
  const k1 = `${m1.getUTCMonth()}_${m1.getUTCFullYear()}`;
  const k2 = `${m2.getUTCMonth()}_${m2.getUTCFullYear()}`;
  const k3 = `${m3.getUTCMonth()}_${m3.getUTCFullYear()}`;
  const weekDict = {};
  weekDayDict = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  weekDict[k1] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k2] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const breakLimit = {};
  breakLimit[k1] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k2] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const avg = {
    totalTime: 0,
    num: 0
  };
  const avgWeekDay = {
    0: { ...avg },
    1: { ...avg },
    2: { ...avg },
    3: { ...avg },
    4: { ...avg },
    5: { ...avg },
    6: { ...avg }
  };
  const avgThreeMonth = {};
  avgThreeMonth[k1] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k2] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k3] = JSON.parse(JSON.stringify(avgWeekDay));

  data.forEach(pre => {
    if (pre.s_id == 10 || pre.s_id == 20 || pre.s_id == 30) {
      const m = pre.ps_time.getUTCMonth();
      const y = pre.ps_time.getUTCFullYear();
      const day = pre.ps_time.getUTCDay();
      weekDict[`${m}_${y}`][day]++;
      if (pre.duration > 50) {
        breakLimit[`${m}_${y}`][day]++;
      }
      avgThreeMonth[`${m}_${y}`][day].totalTime += pre.duration;
      avgThreeMonth[`${m}_${y}`][day].num += 1;
    }
  });

  return {
    weekDict,
    breakLimit,
    avgThreeMonth
  };
};

app.post("/threeMonthlyPicking", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(threeMonthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const threeMonthlyPickingData = threeMonthlyPicking(data, new Date());

    res.send(threeMonthlyPickingData);
  });
});

const threeMonthlyDecocting = (data, date) => {
  const m1 = moment(date).toDate();
  const m2 = moment(date)
    .subtract(1, "month")
    .toDate();
  const m3 = moment(date)
    .subtract(2, "month")
    .toDate();
  const k1 = `${m1.getUTCMonth()}_${m1.getUTCFullYear()}`;
  const k2 = `${m2.getUTCMonth()}_${m2.getUTCFullYear()}`;
  const k3 = `${m3.getUTCMonth()}_${m3.getUTCFullYear()}`;
  const weekDict = {};
  weekDayDict = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  weekDict[k1] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k2] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const breakLimit = {};
  breakLimit[k1] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k2] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const avg = {
    totalTime: 0,
    num: 0
  };
  const avgWeekDay = {
    0: { ...avg },
    1: { ...avg },
    2: { ...avg },
    3: { ...avg },
    4: { ...avg },
    5: { ...avg },
    6: { ...avg }
  };
  const avgThreeMonth = {};
  avgThreeMonth[k1] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k2] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k3] = JSON.parse(JSON.stringify(avgWeekDay));

  data.forEach(pre => {
    if (pre.s_id == 12) {
      const m = pre.ps_time.getUTCMonth();
      const y = pre.ps_time.getUTCFullYear();
      const day = pre.ps_time.getUTCDay();
      weekDict[`${m}_${y}`][day]++;
      if (pre.duration > 50) {
        breakLimit[`${m}_${y}`][day]++;
      }
      avgThreeMonth[`${m}_${y}`][day].totalTime += pre.duration;
      avgThreeMonth[`${m}_${y}`][day].num += 1;
    }
  });

  return {
    weekDict,
    breakLimit,
    avgThreeMonth
  };
};

app.post("/threeMonthlyDecocting", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(threeMonthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const threeMonthlyDecoctingData = threeMonthlyDecocting(data, new Date());

    res.send(threeMonthlyDecoctingData);
  });
});

const threeMonthlyDispense = (data, date) => {
  const m1 = moment(date).toDate();
  const m2 = moment(date)
    .subtract(1, "month")
    .toDate();
  const m3 = moment(date)
    .subtract(2, "month")
    .toDate();
  const k1 = `${m1.getUTCMonth()}_${m1.getUTCFullYear()}`;
  const k2 = `${m2.getUTCMonth()}_${m2.getUTCFullYear()}`;
  const k3 = `${m3.getUTCMonth()}_${m3.getUTCFullYear()}`;
  const weekDict = {};
  weekDayDict = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  };
  weekDict[k1] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k2] = JSON.parse(JSON.stringify(weekDayDict));
  weekDict[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const breakLimit = {};
  breakLimit[k1] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k2] = JSON.parse(JSON.stringify(weekDayDict));
  breakLimit[k3] = JSON.parse(JSON.stringify(weekDayDict));
  const avg = {
    totalTime: 0,
    num: 0
  };
  const avgWeekDay = {
    0: { ...avg },
    1: { ...avg },
    2: { ...avg },
    3: { ...avg },
    4: { ...avg },
    5: { ...avg },
    6: { ...avg }
  };
  const avgThreeMonth = {};
  avgThreeMonth[k1] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k2] = JSON.parse(JSON.stringify(avgWeekDay));
  avgThreeMonth[k3] = JSON.parse(JSON.stringify(avgWeekDay));

  data.forEach(pre => {
    if (pre.s_id == 14 || pre.s_id == 22) {
      const m = pre.ps_time.getUTCMonth();
      const y = pre.ps_time.getUTCFullYear();
      const day = pre.ps_time.getUTCDay();
      weekDict[`${m}_${y}`][day]++;
      if (pre.duration > 50) {
        breakLimit[`${m}_${y}`][day]++;
      }
      avgThreeMonth[`${m}_${y}`][day].totalTime += pre.duration;
      avgThreeMonth[`${m}_${y}`][day].num += 1;
    }
  });

  return {
    weekDict,
    breakLimit,
    avgThreeMonth
  };
};

app.post("/threeMonthlyDispense", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(threeMonthQuery(date), function(err, result) {
    if (err) return next(err);

    var data = result.recordset;

    const threeMonthlyDispenseData = threeMonthlyDispense(data, new Date());

    res.send(threeMonthlyDispenseData);
  });
});

const overall = data => {
  const a = new Set()
  const avg = {
    totalTime: 0,
    num: 0
  };
  const type = {
    pick: { ...avg },
    decoct: { ...avg },
    dispense: { ...avg }
  };
  const dateDict = {};
  for (let i = 0; i < 23; i++) dateDict[i] = JSON.parse(JSON.stringify(type));
  data.forEach(pre => {
    if (
      pre.s_id == 10 ||
      pre.s_id == 20 ||
      pre.s_id == 30 ||
      pre.s_id == 12 ||
      pre.s_id == 14 ||
      pre.s_id == 22
    ) {
      const temp = new Date(pre.ps_time);
      const h = temp.getUTCHours();
      
      const m = temp.getUTCMinutes();
      if ([10, 20, 30].includes(pre.s_id)) {
        dateDict[h].pick.totalTime += pre.duration;
        dateDict[h].pick.num++;
      } else if (pre.s_id == 12) {
        dateDict[h].decoct.totalTime += pre.duration;
        dateDict[h].decoct.num++;
      } else if ([14, 20].includes(pre.s_id)) {
        dateDict[h].dispense.totalTime += pre.duration;
        dateDict[h].dispense.num++;
      }
    }
  });
  return {
    dateDict
  };
};

app.post("/overallProcess", function(req, res) {
  const request = db.request();
  const {date} = req.body;
  request.query(monthQuery(date), function(err, result) {
    // if (err) return next(err);

    var data = result.recordset;
    // console.log(data);
    const overallData = overall(data);
    // // console.log(realTimeData);
    // res.send(realTimeData);
    res.send(overallData);
  });
});


var server = app.listen(5000, function() {
  console.log("Server is running..");
});