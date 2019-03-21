// db.js 
var mssql = require("mssql"); 
var dbConfig = {
  user: 'dashboard',
  password: 'dashboard',
  server: 'huachiewtcm.dyndns.org', 
  database: 'dashboard',
  options: { tdsVersion: '7_1' }  
};

var connection = mssql.connect(dbConfig, function (err) {
    if (err)
        throw err; 
});

module.exports = connection; 

//  select ps_time,CONVERT(varchar(11),ps_time),CONVERT(varchar(11),getdate()) from dbo.psrel WHERE CONVERT(varchar(11),ps_time)=CONVERT(varchar(11),getdate()) ; 