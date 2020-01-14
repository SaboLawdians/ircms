var express = require("express");
var router = express.Router();
var queryUsers = require("../models/queryUsers");

function checkSession(req, res, next) {
  console.log("index 체크세션 in...");
  if (req.session.memberId) {
    console.log("if");
    //next();
    res.redirect("/");
  } else {
    console.log("else");
    next();
    //res.redirect('/users/login');
  }
}

/* GET users listing. */
router.get("/", checkSession, function (req, res, next) {
  console.log("users.js /에 들어옴");
  res.redirect("/users/login");
});

router.get("/login", checkSession, function (req, res) {
  console.log("/user/login에 들어옴");
  res.render("login");
});

router.post("/login", function (req, res) { // user/login
  console.log("post /user/login");
  var memberId = req.body.memberId;
  var memberPwd = req.body.memberPwd;
  var datas = [memberId, memberPwd];
  queryUsers.memberLogin(datas, function (callback) {
    if (callback.isLogin) {
      req.session.memberId = callback.member_id;
      req.session.member_grade = callback.member_grade;
      req.session.member_no = callback.member_no;
      req.session.serial_key = callback.serial_key;
      res.json({
        result: "success",
        member_grade: callback.member_grade,
        member_name: callback.member_name,
        member_no: callback.member_no
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

router.get("/logout", function (req, res) {
  console.log("로그아웃 시전");
  req.session.destroy();
  res.redirect("/users/login");
});

module.exports = router;
