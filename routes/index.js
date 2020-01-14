var express = require("express");
var router = express.Router();
var queryUsers = require("../models/queryUsers");
var xl = require("excel4node");

function checkSession(req, res, next) {
  if (req.session.memberId) {
    next();
  } else {
    //next();
    res.redirect("/users/login");
  }
}

/* GET home page. */
router.get("/", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("index.js /에 들어옴");
  res.render("index", {
    subPage: "main",
    member_grade: member_grade
  });
});

router.get("/index", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/index 들어옴");
  res.render("index", {
    subPage: "main",
    member_grade: member_grade
  });
});

// 메인화면 유저리스트
router.get("/getIndexUserList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  queryUsers.getIndexUserList(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents,
        cnt: callback.cnt,
        todayCnt: callback.todayCnt,
        todayPETprice: callback.todayPETprice
      });
    } else {
      res.json({
        result: "fail",
        member_grade: member_grade
      });
    }
  });
});

// 메인화면 매출 내역
router.get("/getIndexDepositList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  queryUsers.getIndexDepositList(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents,
        totalDeposit: callback.totalDeposit,
        totalDepositToday: callback.totalDepositToday,
        lastDepositDate: callback.lastDepositDate,
        member_grade: member_grade
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

router.get("/getIndexPETList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  queryUsers.getIndexPETList(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents,
        allProvidePET: callback.allProvidePET,
        allAirDropPET: callback.allAirDropPET,
        todayProvidePET: callback.todayProvidePET,
        todayAirDropPET: callback.todayAirDropPET,
        member_grade: member_grade
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

router.get("/userList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/userList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 userList 진입");
    res.render("index", {
      subPage: "userList",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax getUserList 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal];
    queryUsers.getUserList(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail",
          msg: callback.msg
        });
      }
    });
  }
});

// 내가 등록한 회원 목록(정회원 전용)
router.get("/registUserList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  var cur_member_no = req.session.member_no;
  var serial_key = req.session.serial_key;
  console.log("/registUserList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 registUserList 진입");
    res.render("index", {
      subPage: "registUserList",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax registUserList 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal, cur_member_no, serial_key];
    queryUsers.registUserList(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail",
          msg: callback.msg
        });
      }
    });
  }
});

router.get("/userAdd", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  res.render("index", {
    subPage: "userAdd",
    member_grade: member_grade
  });
});

router.post("/userAdd", checkSession, function (req, res) {
  var member_id = req.body.member_id;
  var member_name = req.body.member_name;
  var member_personal_number = req.body.member_personal_number;
  var member_pw = req.body.member_pw;
  var recommender_id = req.body.recommender_id;
  var member_grade = req.body.member_grade;
  var bank_name = req.body.bank_name;
  var account_number = req.body.account_number;
  var account_holder = req.body.account_holder;
  var register_member_no = req.session.member_no;
  var myMember_grade = req.session.member_grade;      //신규 회원 등록자가 관리자/정회원 확인용
  var bank_code = req.body.bank_code;
  var datas = [
    member_id,
    member_pw,
    member_name,
    recommender_id,
    member_grade,
    bank_name,
    account_number,
    account_holder,
    member_personal_number,
    register_member_no,
    myMember_grade,
    bank_code
  ];
  queryUsers.userAdd(datas, function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        msg: callback.msg
      });
    } else {
      res.json({
        result: "fail",
        msg: callback.msg
      });
    }
  });
});

router.get("/userInfo", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  var member_no = req.query.member_no;
  queryUsers.getUserInfo(member_no, function (callback) {
    if (callback.isSuccess) {
      res.render("index", {
        subPage: "userInfo",
        memberInfo: callback.contents[0],
        recommenderName: callback.recommenderName,
        recommenderExist: callback.recommenderExist,
        recommenderNo: callback.recommenderNo,
        recommender_serial_key: callback.recommender_serial_key,
        member_grade: member_grade
      });
    } else {
      console.log("회원 상세정보 오류");
    }
  });
});

//내 수당내역 가져오기[정회원/준회원]
router.get("/myInfo", checkSession, function (req, res) {
  var page = req.query.page;
  page = parseInt(page, 10);
  if (!page) {
    page = 1;
  }
  var member_grade = req.session.member_grade;
  var member_no = req.session.member_no;
  queryUsers.getMyInfo(member_no, function (callback) {
    if (callback.isSuccess) {
      console.log("내 수당내역 가져오기 성공");
      console.log(callback.contents[0]);
      res.render("index", {
        subPage: "myInfo",
        memberInfo: callback.contents[0],
        recommenderName: callback.recommenderName,
        recommenderExist: callback.recommenderExist,
        recommenderNo: callback.recommenderNo,
        member_grade: member_grade,
        page: page
      });
    } else {
      console.log("내 수당내역 가져오기 실패");
    }
  });
});

router.post("/pwReset", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var member_pw = req.body.member_pw;
  var type = req.body.type;
  if (type === "0") {
    //관리자 비밀번호 초기화
    member_pw = "bboompet123!";
  } else {
    //정회원, 준회원 자기 비밀번호 변경
    member_no = req.session.member_no;
  }
  var datas = [member_pw, member_no];
  queryUsers.pwReset(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

router.post("/userModify", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var member_id = req.body.member_id;
  var member_name = req.body.member_name;
  var member_personal_number = req.body.member_personal_number;
  var recommender_id = req.body.recommender_id;
  var member_grade = req.body.member_grade;
  var bank_name = req.body.bank_name;
  var account_number = req.body.account_number;
  var account_holder = req.body.account_holder;
  var bank_code = req.body.bank_code;
  var recommender_change = req.body.recommender_change;
  var recommender_serial_key = req.body.recommender_serial_key;
  var datas = [
    member_id,
    member_name,
    recommender_id,
    member_grade,
    bank_name,
    account_number,
    account_holder,
    member_personal_number,
    member_no,
    bank_code,
    recommender_change,
    recommender_serial_key
  ];
  console.log(datas);
  queryUsers.userModify(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

router.get("/setting", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  queryUsers.getSettingOption(function (callback) {
    if (callback.isSuccess) {
      res.render("index", {
        subPage: "setting",
        settingOption: callback.settingOption,
        member_grade: member_grade
      });
    } else {
      console.log("getSettingError");
    }
  });
});

router.post("/setting", checkSession, function (req, res) {
  var PET_price = req.body.PET_price;
  var rate1 = req.body.rate1;
  var rate2 = req.body.rate2;
  var datas = [PET_price, rate1, rate2];
  console.log(datas);
  queryUsers.settingModify(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//매출내역 추가
router.post("/userDeposit", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var addDeposit = req.body.addDeposit;
  var type = req.body.type;
  if (type == 0) {
    addDeposit = addDeposit * 1;
  } else {
    addDeposit = addDeposit * -1;
  }
  queryUsers.getUserPET(member_no, function (cb) {
    if (cb.isSuccess) {
      var PET = cb.PET;
      var datas = [
        member_no, //회원 번호
        addDeposit, //조정 매출액
        type, //매출액 추가,차감
        PET //회원 보유PET
      ];
      console.log("============================");
      console.log(datas);
      queryUsers.addDepositHistory(datas, function (callback) {
        if (callback) {
          res.json({
            result: "success"
          });
        } else {
          res.json({
            result: "fail"
          });
        }
      });
    } else {
      res.json({
        result: "fail",
        msg: "회원 PET 정보 호출 실패"
      });
    }
  });
});

//매출 대기내역 추가
router.post("/userDepositStandBy", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var addDeposit = req.body.addDeposit;
  if (addDeposit == "") {
    addDeposit = 0;
  }
  var datas = [
    member_no, //회원 번호
    addDeposit //조정 매출액
  ];
  console.log(datas);
  queryUsers.addDepositStanby(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//매출 대기 내역 승인 != 매출내역 추가와 미묘하게 다름
router.post("/userDepositApproval", checkSession, function (req, res) {
  var deposit_stand_by_no = req.body.deposit_stand_by_no;
  var member_no = req.body.member_no;
  var addDeposit = req.body.deposit;
  var type = 0;

  queryUsers.getUserPET(member_no, function (cb) {
    if (cb.isSuccess) {
      var PET = cb.PET;
      var datas = [
        member_no, //회원 번호
        addDeposit, //승인 대기 매출액
        type, //매출액 추가,차감  ※매출 승인은 추가만
        PET //회원 보유PET
      ];
      console.log(datas);
      queryUsers.addDepositHistory(datas, function (callback) {
        if (callback) {
          queryUsers.depositApproval(deposit_stand_by_no, function (callback) {
            if (callback) {
              res.json({
                result: "success"
              });
            } else {
              res.json({
                result: "fail",
                msg: "매출대기 내역 승인 실패"
              });
            }
          });
        } else {
          res.json({
            result: "fail",
            msg: "매출내역 추가 실패"
          });
        }
      });
    } else {
      res.json({
        result: "fail",
        msg: "회원 PET 정보 호출 실패"
      });
    }
  });
});

//회원 보유 PET 변경
router.post("/userPET", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var addPET = req.body.addPET;
  var addsub = req.body.addsub;
  var recommender_id = req.body.recommender_id;
  var datas = [
    member_no, //회원 번호
    addPET, //조정 매출액
    addsub, //PET 추가,차감
    recommender_id,
  ];
  console.log(datas);
  queryUsers.addPETHistory(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//회원 보유 수당 변경
router.post("/userBenefit", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var addbenefit = req.body.addbenefit;
  var addsub = req.body.addsub;
  var benefit = req.body.benefit;
  var datas = [
    member_no, //회원 번호
    addbenefit, //조정 수당
    addsub, //수당 추가,차감
    benefit
  ];
  console.log(datas);
  queryUsers.addBenefitHistory(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//수당 내역 리스트
router.get("/benefit", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/benefit in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  var receptionDate = req.query.receptionDate;

  if (searchSelectVal === undefined) {
    console.log("최초 benefit 진입");
    res.render("index", {
      subPage: "benefit",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax benefit 진입");
    var datas = [page, searchVal, searchSelectVal, receptionDate];
    console.log(datas);
    queryUsers.getBenefitList(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//수당 내역 리스트[엑셀 다운로드]
router.get("/benefitXlsx", checkSession, function (req, res) {
  console.log("ajax benefitXlsx 진입");
  queryUsers.getBenefitListXlsx(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//회원정보 리스트[엑셀 다운로드]
router.get("/userListXlsx", checkSession, function (req, res) {
  console.log("ajax userListXlsx 진입");
  queryUsers.getUserListXlsx(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//PET 내역 리스트[엑셀 다운로드]
router.get("/PET_listXlsx", checkSession, function (req, res) {
  console.log("ajax PET_listXlsx 진입");
  queryUsers.getPET_listXlsx(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//매출 내역 리스트[엑셀 다운로드]
router.get("/depositListXlsx", checkSession, function (req, res) {
  console.log("ajax depositListXlsx 진입");
  queryUsers.getDepositListXlsx(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//정산 내역 리스트[엑셀 다운로드]
router.get("/calculateListXlsx", checkSession, function (req, res) {
  console.log("ajax calculateListXlsx 진입");
  queryUsers.getCalculateListXlsx(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//PET 내역
router.get("/PET_list", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/PET_list in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 getPET_list 진입");
    res.render("index", {
      subPage: "coin",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax getPET_list 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal];
    queryUsers.getPET_list(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//매출 내역 리스트
router.get("/depositList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/depositList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 /depositList 진입");
    res.render("index", {
      subPage: "deposit",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax getDepositList 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal];
    queryUsers.depositList(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//매출 대기 내역
router.get("/depositStandByList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/depositStandByList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 /depositStandByList 진입");
    res.render("index", {
      subPage: "depositStandBy",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax depositStandBy 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal];
    queryUsers.depositStandBy(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//정산 내역 불러오기
router.get("/calculateList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/calculateList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  var receptionDate = req.query.receptionDate;

  if (searchSelectVal === undefined) {
    console.log("최초 calculateList 진입");
    res.render("index", {
      subPage: "calculate",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax calculateList 진입");
    var datas = [page, searchVal, searchSelectVal, receptionDate];
    console.log(datas);
    queryUsers.getCalculateList(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//정산 내역 추가[엑셀 다운로드]
router.post("/calculate", checkSession, function (req, res) {
  queryUsers.calculateAdd(function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

// 회원 가입 시 아이디가 있는지 체크
router.post("/idValidCheck", function (req, res) {
  var memberId = req.body.member_id;
  var type = req.body.type;
  var cur_member_no = req.body.member_no;
  var datas = [memberId, type, cur_member_no];
  console.log(datas);
  queryUsers.memberIdCheck(datas, function (callback) {
    console.log(callback.hasMemberId);
    if (callback.hasMemberId) {
      // 해당 아이디 있음.
      res.json({ result: "isExist", msg: callback.msg });
    } else {
      // 해당 아이디 없음.
      res.json({ result: "noExist", msg: callback.msg });
    }
  });
});

//출금 대기내역 추가
router.post("/withdrawStandBy", checkSession, function (req, res) {
  var member_no = req.body.member_no;
  var withdraw = req.body.withdraw;
  if (withdraw == "") {
    withdraw = 0;
  }
  var datas = [
    member_no, //회원 번호
    withdraw //출금 신청액
  ];
  console.log(datas);
  queryUsers.addWithdrawStanby(datas, function (callback) {
    if (callback) {
      res.json({
        result: "success"
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//출금 대기 내역
router.get("/getWithdrawList", checkSession, function (req, res) {
  var member_grade = req.session.member_grade;
  console.log("/getWithdrawList in");
  var page = req.query.page;
  page = parseInt(page, 10);

  if (!page) {
    page = 1;
  }

  var selectVal = req.query.selectVal;
  var searchSelectVal = req.query.searchSelectVal;
  var searchVal = req.query.searchVal;
  console.log("selectVal === " + selectVal);
  if (selectVal === undefined) {
    console.log("최초 /getWithdrawList 진입");
    res.render("index", {
      subPage: "withdrawStandBy",
      page: page,
      member_grade: member_grade
    });
  } else {
    console.log("ajax withdrawStandBy 진입");
    var datas = [selectVal, page, searchVal, searchSelectVal];
    queryUsers.withdrawStandBy(datas, function (callback) {
      if (callback.isSuccess) {
        res.json({
          result: "success",
          contents: callback.contents,
          pageSize: callback.pageSize,
          startPage: callback.startPage,
          endPage: callback.endPage,
          totalPage: callback.totalPage,
          max: callback.max,
          totalCount: callback.totalCount,
          page: page
        });
      } else {
        res.json({
          result: "fail"
        });
      }
    });
  }
});

//내 출금 내역[정회원/준회원]
router.get("/myWithdrawList", checkSession, function (req, res) {
  var member_no = req.session.member_no;
  console.log("/myWithdrawList in");
  var page = req.query.page;
  page = parseInt(page, 10);
  if (!page) {
    page = 1;
  }

  console.log("ajax myWithdrawList 진입");
  var datas = [page, member_no];
  queryUsers.myWithdrawHistory(datas, function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",
        contents: callback.contents,
        pageSize: callback.pageSize,
        startPage: callback.startPage,
        endPage: callback.endPage,
        totalPage: callback.totalPage,
        max: callback.max,
        totalCount: callback.totalCount,
        page: page
      });
    } else {
      res.json({
        result: "fail"
      });
    }
  });
});

//출금 대기 내역 승인/거절
router.post("/userWithdrawApproval", checkSession, function (req, res) {
  var withdraw_stand_by_no = req.body.withdraw_stand_by_no;
  var member_no = req.body.member_no;
  var withdraw = req.body.withdraw;
  var type = req.body.type;
  var datas = [type, withdraw_stand_by_no];
  var datas2 = [withdraw, member_no];
  queryUsers.withdrawApproval(datas, function (callback) {  //출금 신청내역 승인여부 변경 
    if (callback) {
      if (type === "2") {     //거절 프로세스
        queryUsers.refundBenefit(datas2, function (callback2) {         //출금 신청수당 회원 환불
          if (callback2) {
            res.json({
              result: "success"
            });
          } else {
            res.json({
              result: "fail",
              msg: "출금 신청액 환불 실패"
            });
          }
        });
      } else {                //승인 완료
        res.json({
          result: "success"
        });
      }
    } else {
      res.json({
        result: "fail",
        msg: "매출대기 내역 승인 실패"
      });
    }
  });
});

//비문수집기 반려동물 등록수 체크
router.get('/petCountCheck', function (req, res) {
  //반려동물이 1000건 미만이면 true 1000건 다찼으면 false
  queryUsers.petCountCheck(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",    //아직 1000마리 안됐음
        cnt: callback.cnt
      })
    } else {
      res.json({
        result: "fail"   //1000마리 다찼음
      })
    }
  });
})

//비문수집기 반려견 데이터 DBinsert API
router.post('/petDataCollect', function (req, res) {
  // body 데이터 체크 
  var member_no = req.body.member_no;
  var petData = req.body.petData;
  var datas = [member_no, petData];
  //pet테이블에 데이터 insert
  queryUsers.petDataCollect(datas, function (callback) {
    if (callback) {
      // 보상 pet, 더블 에어드랍 계산
      queryUsers.petCollectAirdrop(member_no, function (cb) {
        if (cb) {
          res.json({
            result: "success",
            msg: "비문 수집, PET보상 성공"
          })
        } else {
          res.json({
            result: "fail",
            msg: "비문수집 성공, PET보상 실패"
          })
        }
      });
    } else {
      res.json({
        result: "fail",
        msg: "비문수집 실패, PET보상 실패"
      })
    }
  });
})

//뿜지갑앱에 현재 코인가격 response
router.get('/PET_price', function (req, res) {
  //반려동물이 1000건 미만이면 true 1000건 다찼으면 false
  queryUsers.getPETPrice(function (callback) {
    if (callback.isSuccess) {
      res.json({
        result: "success",   
        PET_price: callback.PET_price
      })
    } else {
      res.json({
        result: "fail"   
      })
    }
  });
})



module.exports = router;
