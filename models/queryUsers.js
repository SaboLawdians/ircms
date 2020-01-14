var db_conn = require("./dbConn");
var enDec = require("./enDec");
var pool = db_conn.pool;

//회원 로그인
exports.memberLogin = memberLogin;
function memberLogin(data, callback) {
  var isSuccess = { isLogin: false, member_id: "", member_grade: "", serial_key: "", member_no: "", member_name: "" };
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    var sql = "select * from member where member_id = ?";
    var checkPwd = "";
    var loginSql = "select * from member where member_id = ? AND member_pw = ?";
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, data[0], function (err, rows) {
        //해당 id있나 찾아보기
        if (err) console.error("err", err);
        if (rows.length === 1) {
          //id있음
          checkPwd = enDec.seedEncrytion(data[1]);
          conn.query(loginSql, [data[0], checkPwd], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(isSuccess);
              conn.release(); // 해제
            } else {
              if (rows.length === 1) {
                isSuccess.isLogin = true;
                isSuccess.member_id = data[0];
                isSuccess.member_grade = rows[0].member_grade;
                isSuccess.member_no = rows[0].member_no;
                isSuccess.member_name = enDec.seedDecrytion(rows[0].member_name);
                isSuccess.serial_key = rows[0].serial_key;
                callback(isSuccess);
                conn.release();
              } else {
                callback(isSuccess);
                conn.release();
              }
            }
          });
        } else {
          callback(isSuccess);
          conn.release();
        }
      });
    });
  });
}

// 회원 등록
exports.userAdd = userAdd;
function userAdd(datas, callback) {
  var contentObj = { isSuccess: false, msg: "" };
  var member_id = datas[0];
  var member_pw = enDec.seedEncrytion(datas[1]);
  var member_name = enDec.seedEncrytion(datas[2]);
  var recommender_id, create_serial_key = "";
  if (datas[3] !== "") {
    recommender_id = datas[3];
  } else {
    recommender_id = null;
  }
  var member_grade = datas[4];
  var bank_name = datas[5];
  var account_number = enDec.seedEncrytion(datas[6]);
  var account_holder = enDec.seedEncrytion(datas[7]);
  var member_personal_number = enDec.seedEncrytion(datas[8]);
  var register_member_no = datas[9];
  var myMember_grade = datas[10];
  var bank_code = datas[11];
  var sqlDatas = [
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
    bank_code
  ];
  var idCheckSql = "select * from member where member_id = ?";
  if (recommender_id === null) {    //추천인 미입력 ※관리자만 할 수 있으므로, 관리자의 하부계정 수, 관리자의 시리얼키 ""를 가져온다
    create_serial_key += "select member_no,serial_key from member where member_id = 'master';select max(member_no) last_member_no from member;";
  } else {                          //추천인 입력   ※관리자/사외이사에 관계없이, 추천인의 하부계정 수, 추천인의 시리얼키를 가져온다
    create_serial_key += "select member_no,serial_key from member where member_id = '" + recommender_id + "';select max(member_no) last_member_no from member;";
  }
  var sql =
    "insert into member(member_id,member_pw,member_name,recommender_id,member_grade,bank_name,account_number,account_holder,member_personal_number,register_member_no,bank_code,serial_key,recommender_no) values(?,?,?,?,?,?,?,?,?,?,?,?,?);";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(idCheckSql, member_id, function (err, row) {
        if (err) {
          conn.release();
          throw err;
        }
        if (row.length == 0) {    //해당 아이디가 없을
          conn.query(create_serial_key, function (err, row2) { //추천인의 serial_key ※기능 실행자가 관리자일 경우 master의 serial_key 호출 ""
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              var serial_key = row2[0][0].serial_key;
              var last_member_no = (row2[1][0].last_member_no * 1) + 1;
              // 하위계정 시리얼키 생성 기능
              serial_key += last_member_no + ".";
              //
              sqlDatas.push(serial_key);
              sqlDatas.push(row2[0][0].member_no);
              conn.query(sql, sqlDatas, function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                } else {
                  conn.commit(function (err) {
                    if (err) {
                      return conn.rollback(function () {
                        conn.release();
                        throw err;
                      });
                    }
                    conn.release();
                    contentObj.isSuccess = true;
                    callback(contentObj);
                  });
                }
              });
            }
          });
        } else {
          conn.release();
          contentObj.msg = "이미 사용중인 아이디 입니다";
          callback(contentObj);
        }
      });
    });
  });
}

//회원 비밀번호 초기화
exports.pwReset = pwReset;
function pwReset(datas, callback) {
  var isSuccess = false;
  console.log(datas);
  if (datas[0] === undefined || datas[0] === "") {
    callback(isSuccess);
  } else {
    datas[0] = enDec.seedEncrytion(datas[0]);
    var sql = "update member set member_pw = ? where member_no = ?";
    pool.getConnection(function (err, conn) {
      if (err) console.error("err", err);
      conn.beginTransaction(function (err) {
        if (err) {
          conn.release();
          throw err;
        }
        conn.query(sql, datas, function (err, result) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          } else {
            conn.commit(function (err) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              }
              conn.release();
              isSuccess = true;
              callback(isSuccess);
            });
          }
        });
      });
    });
  }
}

// 회원 정보수정
exports.userModify = userModify;
function userModify(datas, callback) {
  var isSuccess = false;
  var member_id = datas[0];
  var member_name = enDec.seedEncrytion(datas[1]);
  var recommender_id;
  if (datas[2] !== "") {
    recommender_id = datas[2];
  } else {
    recommender_id = null;
  }
  var member_grade = datas[3];
  var bank_name = datas[4];
  var account_number = enDec.seedEncrytion(datas[5]);
  var account_holder = enDec.seedEncrytion(datas[6]);
  var member_personal_number = enDec.seedEncrytion(datas[7]);
  var member_no = datas[8];
  var bank_code = datas[9];
  var recommender_change = datas[10];
  var recommender_serial_key = datas[11];
  if (!recommender_change) {  //추천인 변경 안함
    console.log('추천인 변경 안함');
    var sqlDatas = [
      member_id,
      member_name,
      member_grade,
      bank_name,
      bank_code,
      account_number,
      account_holder,
      member_personal_number,
      member_no
    ];
    var sql =
      "update member set member_id = ?, member_name = ?,member_grade = ?,bank_name = ?,bank_code = ? ,account_number = ?,account_holder = ?,member_personal_number = ? where member_no = ?";
    pool.getConnection(function (err, conn) {
      if (err) console.error("err", err);
      conn.beginTransaction(function (err) {
        if (err) {
          conn.release();
          throw err;
        }
        conn.query(sql, sqlDatas, function (err) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          } else {
            conn.commit(function (err) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              }
              conn.release();
              isSuccess = true;
              callback(isSuccess);
            });
          }
        });
      });
    });
  } else {                    //추천인 변경
    console.log('추천인 변경');
    //추천인이 존재여부 이미확인
    //해당 회원의 시리얼키를 가진 하부계정 전부 호출
    //.357.358.359.
    var originRecommender_serial_key = "select member_no,serial_key from member where serial_key like '%." + member_no + ".%'";
    var newRecommender_serial_key = "select member_no,serial_key from member where member_id = ?";
    console.log(originRecommender_serial_key);
    pool.getConnection(function (err, conn) {
      if (err) console.error("err", err);
      conn.beginTransaction(function (err) {
        if (err) {
          conn.release();
          throw err;
        }
        conn.query(originRecommender_serial_key, function (err, row) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          } else {
            if (recommender_id === null) {
              console.log('추천인 없애기');
              //추천인을 지우면
              //자기 하위계정을 다 가져와서
              //자기 시리얼키 부분을 ""로 바꾼다
              var updateSql = "";
              row.forEach(function (item) {
                var newSerial_key = item.serial_key.replace(recommender_serial_key, ".");
                console.log(recommender_serial_key + " : " + item.serial_key);
                if (recommender_serial_key !== item.serial_key) {
                  updateSql += "update member set serial_key = '" + newSerial_key + "' where member_no = " + item.member_no + ";";
                }
              });
              conn.query(updateSql, function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                } else {
                  //이제 나머지 정보 업데이트
                  var sqlDatas = [
                    member_id,
                    member_name,
                    recommender_id,
                    member_grade,
                    bank_name,
                    bank_code,
                    account_number,
                    account_holder,
                    member_personal_number,
                    member_no
                  ];
                  var sql =
                    "update member set member_id = ?, member_name = ?,recommender_id = ? ,member_grade = ?,bank_name = ?,bank_code = ? ,account_number = ?,account_holder = ?,member_personal_number = ? where member_no = ?";
                  console.log(sqlDatas);
                  conn.query(sql, sqlDatas, function (err) {
                    if (err) {
                      return conn.rollback(function () {
                        conn.release();
                        throw err;
                      });
                    } else {
                      conn.commit(function (err) {
                        if (err) {
                          return conn.rollback(function () {
                            conn.release();
                            throw err;
                          });
                        }
                        conn.release();
                        isSuccess = true;
                        callback(isSuccess);
                      });
                    }
                  });
                }
              })
            } else {
              console.log('새 추천인 입력');
              //새 추천인의 시리얼키를 가져와서
              conn.query(newRecommender_serial_key, recommender_id, function (err, row2) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                } else {
                  var updateSql = "";
                  var newRecommender_no = "." + row2[0].member_no + ".";
                  if (recommender_serial_key === "") {
                    recommender_serial_key = '.';
                  }
                  console.log(recommender_serial_key + " , " + row2[0].serial_key);
                  row.forEach(function (item) {
                    console.log(item.serial_key);
                    var newSerial_key = item.serial_key.replace(recommender_serial_key, row2[0].serial_key);
                    console.log(recommender_serial_key + " : " + item.serial_key + " : " + newSerial_key);
                    if (recommender_serial_key !== item.serial_key && newRecommender_no !== item.serial_key) {
                      updateSql += "update member set serial_key = '" + newSerial_key + "' where member_no = " + item.member_no + ";";
                    }
                  });
                  if (updateSql !== "") {
                    conn.query(updateSql, function (err) {
                      if (err) {
                        return conn.rollback(function () {
                          conn.release();
                          throw err;
                        });
                      } else {
                        //이제 나머지 정보 업데이트
                        var sqlDatas = [
                          member_id,
                          member_name,
                          recommender_id,
                          member_grade,
                          bank_name,
                          bank_code,
                          account_number,
                          account_holder,
                          member_personal_number,
                          member_no
                        ];
                        var sql =
                          "update member set member_id = ?, member_name = ?,recommender_id = ? ,member_grade = ?,bank_name = ?,bank_code = ? ,account_number = ?,account_holder = ?,member_personal_number = ? where member_no = ?";
                        console.log(sqlDatas);
                        conn.query(sql, sqlDatas, function (err) {
                          if (err) {
                            return conn.rollback(function () {
                              conn.release();
                              throw err;
                            });
                          } else {
                            conn.commit(function (err) {
                              if (err) {
                                return conn.rollback(function () {
                                  conn.release();
                                  throw err;
                                });
                              }
                              conn.release();
                              isSuccess = true;
                              callback(isSuccess);
                            });
                          }
                        });
                      }
                    })
                  } else {
                    conn.release();
                    isSuccess = true;
                    callback(isSuccess);
                  }
                }
              });
            }
          }
        });
      });
    });
  }
}

// 회원 상세정보
exports.getUserInfo = getUserInfo;
function getUserInfo(member_no, callback) {
  console.log('getUserInfo');
  var contentsObj = {
    contents: {},
    isSuccess: false,
    recommenderName: "",
    recommenderExist: false,
    recommenderNo: 0,
    recommender_serial_key: ""
  };
  var sql = "select a.benefit,a.member_no,a.member_id,a.member_name,a.member_grade,a.bank_name,a.bank_code,a.account_number,a.account_holder,a.member_personal_number,ifnull(b.after_PET,0) PET,sum(ifnull(c.deposit,0)) deposit,a.recommender_id from member a LEFT JOIN (select after_PET,member_no from PET_history where member_no = ? order by pet_history_no desc limit 1) b ON a.member_no = b.member_no LEFT JOIN deposit_history c on a.member_no = c.member_no where a.member_no = ? order by c.deposit_history_no desc";
  var recommendSql = "select * from member where member_id = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, [member_no, member_no], function (err, row) {
        if (err) {
          conn.release();
          callback(contentsObj);
        } else {
          row[0].member_name = enDec.seedDecrytion(row[0].member_name);
          row[0].account_number = enDec.seedDecrytion(row[0].account_number);
          row[0].account_holder = enDec.seedDecrytion(row[0].account_holder);
          row[0].member_personal_number = enDec.seedDecrytion(
            row[0].member_personal_number
          );
          console.log(row);
          if (row[0].recommender_id !== null) {
            //추천인이 null이 아니면 추천인 정보 찾기
            row[0].recommender_id = row[0].recommender_id;
            conn.query(recommendSql, row[0].recommender_id, function (err, result) {
              if (err) {
                conn.release();
                callback(contentsObj);
              } else {
                result[0].member_name = enDec.seedDecrytion(
                  result[0].member_name
                );
                contentsObj.contents = row;
                contentsObj.isSuccess = true;
                contentsObj.recommenderName = result[0].member_name;
                contentsObj.recommenderNo = result[0].member_no;
                contentsObj.recommenderExist = true;
                contentsObj.recommender_serial_key = result[0].serial_key;
                conn.release();
                callback(contentsObj);
              }
            });
          } else {
            contentsObj.contents = row;
            contentsObj.isSuccess = true;
            conn.release();
            callback(contentsObj);
          }
        }
      });
    })
  });
}

// 내 PET,수당 내역
exports.getMyInfo = getMyInfo;
function getMyInfo(member_no, callback) {
  console.log('getMyInfo');
  var contentsObj = {
    contents: {},
    isSuccess: false,
    recommenderName: "",
    recommenderExist: false,
    recommenderNo: 0
  };
  var sql = "select h.member_no,h.member_id,h.member_name,h.recommender_id,ifnull(i.deposit,0) deposit,ifnull(c.addAirdrop,0)-ifnull(j.subAirdrop,0) airdrop,ifnull(d.addDoubleAirdrop,0)-ifnull(k.subDoubleAirdrop,0) doubleAirdrop,ifnull(e.addAdminBonus,0)-ifnull(l.subAdminBonus,0) adminBonus,ifnull(b.after_PET,0) current_PET,ifnull(f.addSaving_benefit,0) - ifnull(m.subSaving_benefit,0) saving_benefit,ifnull(g.calculate_benefit,0) calculate_benefit,h.benefit current_benefit,h.account_number,h.account_holder,h.bank_name,h.bank_code " +
    " from (select max(a.pet_history_no) latest,a.member_no from PET_history a JOIN member b on a.member_no = b.member_no group by member_no) a JOIN PET_history b ON a.member_no = b.member_no and a.latest = b.pet_history_no" +
    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) addAirdrop,member_no from PET_history where type = 0 and add_sub = 0 group by member_no) c on a.member_no = c.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) addDoubleAirdrop,member_no from PET_history where type = 1 and add_sub = 0 group by member_no) d on a.member_no = d.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) addAdminBonus,member_no from PET_history where type = 2 and add_sub = 0 group by member_no) e on a.member_no = e.member_no" +

    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) subAirdrop,member_no from PET_history where type = 0 and add_sub = 1 group by member_no) j on a.member_no = j.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) subDoubleAirdrop,member_no from PET_history where type = 1 and add_sub = 1 group by member_no) k on a.member_no = k.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(PET,3)),0) subAdminBonus,member_no from PET_history where type = 2 and add_sub = 1 group by member_no) l on a.member_no = l.member_no" +

    " LEFT JOIN (select ifnull(sum(truncate(benefit,3)),0) addSaving_benefit,member_no from benefit_history where type = 0 group by member_no) f on a.member_no = f.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(benefit,3)),0) subSaving_benefit,member_no from benefit_history where type = 3 group by member_no) m on a.member_no = m.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(benefit,3)),0) calculate_benefit,member_no from benefit_history where type = 1 group by member_no) g on a.member_no = g.member_no" +
    " LEFT JOIN (select ifnull(sum(truncate(deposit,3)),0) deposit,member_no from deposit_history where 1=1 group by member_no) i on a.member_no = i.member_no" +

    " RIGHT JOIN member h on a.member_no = h.member_no" +
    " where 1=1 and h.member_no = ?";
  var recommendSql = "select * from member where member_id = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, member_no, function (err, row) {
        if (err) {
          conn.release();
          callback(contentsObj);
        } else {
          row[0].member_name = enDec.seedDecrytion(row[0].member_name);
          row[0].account_number = enDec.seedDecrytion(row[0].account_number);
          row[0].account_holder = enDec.seedDecrytion(row[0].account_holder);
          console.log(row);
          if (row[0].recommender_id !== null) {
            //추천인이 null이 아니면 추천인 정보 찾기
            row[0].recommender_id = row[0].recommender_id;
            conn.query(recommendSql, row[0].recommender_id, function (err, result) {
              if (err) {
                conn.release();
                callback(contentsObj);
              } else {
                result[0].member_name = enDec.seedDecrytion(result[0].member_name);
                contentsObj.contents = row;
                contentsObj.isSuccess = true;
                contentsObj.recommenderName = result[0].member_name;
                contentsObj.recommenderNo = result[0].member_no;
                contentsObj.recommenderExist = true;
                conn.release();
                callback(contentsObj);
              }
            });
          } else {
            contentsObj.contents = row;
            contentsObj.isSuccess = true;
            conn.release();
            callback(contentsObj);
          }
        }
      });
    })
  });
}


// 회원 목록
exports.getUserList = getUserList;
function getUserList(datas, callback) {
  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];
  console.log('=======');
  console.log(datas);
  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false,
    msg: ""
  };

  var sql = "";
  var getSerialKeySql = "select serial_key from member where 1=1 ";
  var sqlCount = "";
  if (searchSelectVal === "1") {
    //아이디 검색
    getSerialKeySql += " and member_id ='" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    getSerialKeySql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      getSerialKeySql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    } else {
      getSerialKeySql += " order by serial_key asc";
    }
  }
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      console.log(getSerialKeySql);
      conn.query(getSerialKeySql, function (err, result) {
        if (err) {
          conn.release();
          throw err;
        }

        console.log(result);
        if (searchVal !== "" && result.length > 1) {
          contentsObj.msg = "전화번호로 검색해 주세요";
          callback(contentsObj);
          conn.release();
        } else
          if (result.length > 0) {
            var serial_key = result[0].serial_key;
            console.log("serial_key : " + serial_key);
            if (selectVal !== "-") {
              //등급 선택
              sql += "select c.benefit,c.member_no,c.member_id,c.member_name,c.recommender_id,c.member_grade,c.reg_date,ifNULL(d.after_PET,0) PET from member c LEFT JOIN (select after_PET,b.member_no from PET_history a JOIN (select max(pet_history_no) latest,member_no from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no) d on c.member_no = d.member_no where 1=1 and c.member_no <> 0 and serial_key like '" + serial_key + "%'  and member_grade = " + selectVal;
              sqlCount +=
                "select count(*) cnt from member where 1=1 and member_no <> 0 and serial_key like '" + serial_key + "%' and member_grade = " + selectVal;
            } else {
              //전체 목록
              sql += "select c.benefit,c.member_no,c.member_id,c.member_name,c.recommender_id,c.member_grade,c.reg_date,ifNULL(d.after_PET,0) PET from member c LEFT JOIN (select after_PET,b.member_no from PET_history a JOIN (select max(pet_history_no) latest,member_no from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no) d on c.member_no = d.member_no where 1=1 and c.member_no <> 0 and serial_key like '" + serial_key + "%' ";
              sqlCount += "select count(*) cnt from member where 1=1 and member_no <> 0 and serial_key like '" + serial_key + "%' ";
            }

            sql += " group by c.member_no ";
            if (searchVal === "") {
              sql += "order by c.reg_date desc ";
            } else {
              sql += "order by c.member_no , c.serial_key asc ";
            }
            sql += " limit ?,?";

            console.log(sql);
            var size = 10; // 한 페이지에 10개의 글을 보여준다.
            var begin = (page - 1) * size; // 시작 글
            conn.query(sqlCount, function (err, countRows) {
              if (err) {
                console.error("err", err);
                callback(contentsObj);
                conn.release();
              } else {
                conn.query(sql, [begin, size], function (err, rows) {
                  if (err) {
                    console.error("err", err);
                    callback(contentsObj);
                    conn.release();
                  } else {
                    var cnt = countRows[0].cnt; // 전체 글의 수
                    var totalPage = Math.ceil(cnt / size); // 총 페이지 수
                    var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
                    var currentBlock = Math.ceil(page / pageSize);
                    var startPage = (currentBlock - 1) * pageSize + 1;
                    var endPage = startPage + (pageSize - 1);
                    if (endPage > totalPage) {
                      // 예) 20 > 총 17페이지
                      endPage = totalPage;
                    }
                    var max = cnt - (page - 1) * size;
                    for (var i = 0; i < rows.length; i++) {
                      rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
                      if (rows[i].recommender_id !== null) {
                        rows[i].recommender_id = rows[i].recommender_id;
                      }
                    }
                    contentsObj.pageSize = pageSize;
                    contentsObj.startPage = startPage;
                    contentsObj.endPage = endPage;
                    contentsObj.totalPage = totalPage;
                    contentsObj.max = max;
                    contentsObj.totalCount = cnt;
                    contentsObj.isSuccess = true;
                    contentsObj.contents = rows;
                    callback(contentsObj);
                    conn.release();
                  }
                });
              }
            });
          } else {
            callback(contentsObj);
            conn.release();
          }
      });
    });
  });
}

// 하위 회원 목록
exports.registUserList = registUserList;
function registUserList(datas, callback) {
  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];
  var cur_member_no = datas[4];
  var serial_key = datas[5];
  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false,
    msg: ""
  };

  var sql = "";
  var getSerialKeySql = "select serial_key from member where 1=1 ";
  var sqlCount = "";
  if (searchSelectVal === "1") {
    //아이디 검색
    getSerialKeySql += " and member_id = '" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    getSerialKeySql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      getSerialKeySql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    } else {  //아무것도 검색을 안했으면 내 시리얼 키를 불러와
      getSerialKeySql += " and member_no = " + cur_member_no;
    }
  }
  console.log(getSerialKeySql);
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(getSerialKeySql, function (err, result) {
        if (err) {
          conn.release();
          throw err;
        }
        console.log(result);
        if (searchVal !== "" && result.length > 1) {
          contentsObj.msg = "전화번호로 검색해 주세요";
          callback(contentsObj);
          conn.release();
        } else
          if (result.length > 0) {
            var searchserial_key = result[0].serial_key;
            console.log("serial_key : " + serial_key);
            if (selectVal !== "-") {
              //등급 선택
              sql += "select c.benefit,c.member_no,c.member_id,c.member_name,c.recommender_id,c.member_grade,c.reg_date,ifNULL(d.after_PET,0) PET from member c LEFT JOIN (select after_PET,b.member_no from PET_history a JOIN (select max(pet_history_no) latest,member_no from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no) d on c.member_no = d.member_no where 1=1 and serial_key like '" + serial_key + "%' and member_grade = " + selectVal + " and serial_key like '" + searchserial_key + "%'";
              sqlCount +=
                "select count(*) cnt from member where 1=1 and serial_key like '" + serial_key + "%' and member_grade = " + selectVal + " and serial_key like '" + searchserial_key + "%'";
            } else {
              //전체 목록
              sql += "select c.benefit,c.member_no,c.member_id,c.member_name,c.recommender_id,c.member_grade,c.reg_date,ifNULL(d.after_PET,0) PET from member c LEFT JOIN (select after_PET,b.member_no from PET_history a JOIN (select max(pet_history_no) latest,member_no from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no) d on c.member_no = d.member_no where 1=1 and serial_key like '" + serial_key + "%' and serial_key like '" + searchserial_key + "%'";
              sqlCount += "select count(*) cnt from member where 1=1 and serial_key like '" + serial_key + "%' and serial_key like '" + searchserial_key + "%'";
            }
            sql += " group by c.member_no ";
            if (searchVal === "") {
              sql += "order by c.reg_date desc ";
            } else {
              sql += "order by c.member_no , c.serial_key asc ";
            }
            sql += " limit ?,?";
            console.log(sql);
            var size = 10; // 한 페이지에 10개의 글을 보여준다.
            var begin = (page - 1) * size; // 시작 글

            conn.query(sqlCount, function (err, countRows) {
              if (err) {
                console.error("err", err);
                callback(contentsObj);
                conn.release();
              } else {
                conn.query(sql, [begin, size], function (err, rows) {
                  if (err) {
                    console.error("err", err);
                    callback(contentsObj);
                    conn.release();
                  } else {
                    var cnt = countRows[0].cnt; // 전체 글의 수
                    var totalPage = Math.ceil(cnt / size); // 총 페이지 수
                    var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
                    var currentBlock = Math.ceil(page / pageSize);
                    var startPage = (currentBlock - 1) * pageSize + 1;
                    var endPage = startPage + (pageSize - 1);
                    if (endPage > totalPage) {
                      // 예) 20 > 총 17페이지
                      endPage = totalPage;
                    }
                    var max = cnt - (page - 1) * size;
                    for (var i = 0; i < rows.length; i++) {
                      rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
                      if (rows[i].recommender_id !== null) {
                        rows[i].recommender_id = rows[i].recommender_id;
                      }
                    }
                    contentsObj.pageSize = pageSize;
                    contentsObj.startPage = startPage;
                    contentsObj.endPage = endPage;
                    contentsObj.totalPage = totalPage;
                    contentsObj.max = max;
                    contentsObj.totalCount = cnt;
                    contentsObj.isSuccess = true;
                    contentsObj.contents = rows;
                    callback(contentsObj);
                    conn.release();
                  }
                });
              }
            });
          } else {
            callback(contentsObj);
            conn.release();
          }
      });
    });
  });
}

// 사이트 관리 옵션 가져오기
exports.getSettingOption = getSettingOption;
function getSettingOption(callback) {
  var sql = "select * from PET_setting";
  var contentsObj = { isSuccess: false, settingOption: {} };
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          contentsObj.isSuccess = true;
          contentsObj.settingOption = rows[0];
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// PET내역 추가
exports.addPETHistory = addPETHistory;
function addPETHistory(datas, callback) {
  var isSuccess = false;
  var member_no = datas[0];
  var addPET = datas[1] * 1;
  var addsub = datas[2];
  var recommender_id = datas[3];
  if (recommender_id === "") {
    recommender_id = null;
  }
  var PET = 0;
  var afterPET = 0;
  //최신 PET 가져오기
  var current_PET = "select after_PET,member_no from PET_history where member_no = ? order by pet_history_no desc limit 1"
  var insertSql = "insert into PET_history (member_no,recommender_id,PET,type,before_PET,after_PET,add_sub) values(?,?,?,2,?,?,?)";

  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(current_PET, member_no, function (err, result) {
        //매출내역 추가 sql
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          if (result.length > 0) {
            PET = result[0].after_PET;
          } else {
            PET = 0;
          }
          if (addsub == 0) {
            afterPET = (parseFloat(PET) + parseFloat(addPET)).toFixed(3);
          } else {
            afterPET = (parseFloat(PET) - parseFloat(addPET)).toFixed(3);
          }
          var insertDatas = [
            member_no, recommender_id, addPET, PET, afterPET, addsub
          ];
          console.log(insertDatas);
          conn.query(insertSql, insertDatas, function (err) {
            //PET내역 추가 sql
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              conn.commit(function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                }
                console.log('conn.commit 끝');
                conn.release();
                isSuccess = true;
                callback(isSuccess);
              });
            }
          });
        }
      });
    });
  });
};

// 수당내역 추가
exports.addBenefitHistory = addBenefitHistory;
function addBenefitHistory(datas, callback) {
  var isSuccess = false;
  var member_no = datas[0];
  var addBenefit = datas[1];
  var addsub = datas[2];
  var benefit = datas[3];
  var insertSql = "insert into benefit_history (member_no,before_benefit,benefit,after_benefit,type) values(?,?,?,?,?)";
  var updateSql = "update member set benefit = ? where member_no = ?";
  if (addsub == 0) {  //수당 추가
    var afterBenefit = (parseFloat(benefit) + parseFloat(addBenefit)).toFixed(3);
  } else {            //수당 차감
    var afterBenefit = (parseFloat(benefit) - parseFloat(addBenefit)).toFixed(3);
  }
  var insertDatas = [
    member_no, benefit, addBenefit, afterBenefit, addsub
  ];
  var updateDatas = [
    afterBenefit, member_no
  ]
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(insertSql, insertDatas, function (err) {
        //수당내역 추가 sql
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.query(updateSql, updateDatas, function (err) {
            //수당내역 추가 sql
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              conn.commit(function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                }
                console.log('conn.commit 끝');
                conn.release();
                isSuccess = true;
                callback(isSuccess);
              });
            }
          });
        }
      });
    });
  });
};


// 매출 대기내역 추가
exports.addDepositStanby = addDepositStanby;
function addDepositStanby(datas, callback) {
  var isSuccess = false;
  var insertSql = "insert into deposit_stand_by (member_no,deposit,deposit_complete) values(?,?,0)";

  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(insertSql, datas, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
};

// 매출 대기내역 승인
exports.depositApproval = depositApproval;
function depositApproval(data, callback) {
  var isSuccess = false;
  var updateSql = "update deposit_stand_by set deposit_complete = 1 where deposit_stand_by_no = ?";

  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(updateSql, data, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
};

// 매출내역 추가
exports.addDepositHistory = addDepositHistory;
function addDepositHistory(datas, callback) {
  var isSuccess = false;
  var member_no = datas[0];
  var addDeposit = datas[1];
  var type = datas[2];
  var PET = datas[3];
  var PET_price_sql = "select PET_price from PET_setting";
  var insertSql = "insert into deposit_history (member_no,deposit,type) values(?,?,?)";
  var recommenderCheckSql = "select recommender_id,recommender_no from member where member_no = ?";
  var weekUpdateSql = "update deposit_week set current_week_deposit = current_week_deposit + ?";

  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(PET_price_sql, function (err, row) {          //코인가격 불러오는 sql
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.query(insertSql, datas, function (err) {    //매출내역 추가 sql
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              console.log(weekUpdateSql);
              console.log(addDeposit);
              conn.query(weekUpdateSql, addDeposit, function (err) {    //금주 매출액 누적 sql
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                } else {
                  if (Math.sign(addDeposit) === -1) { //addDeposit이 음수인 경우
                    addDeposit = Math.abs(addDeposit);
                  }
                  var rewardPET = parseFloat(addDeposit / row[0].PET_price).toFixed(3); // (매출액/코인가격)만큼의 코인 배당하기   ※에어드랍
                  console.log(rewardPET);
                  if (type == 0) {
                    var afterPET = (parseFloat(PET) + parseFloat(rewardPET)).toFixed(3);
                  } else {
                    var afterPET = (parseFloat(PET) - parseFloat(rewardPET)).toFixed(3);
                  }
                  if (afterPET < 0) {     //처리후 PET이 음수일 경우, 0으로 들어간다
                    afterPET = 0;
                  }
                  conn.query(recommenderCheckSql, member_no, function (err, result) {
                    if (err) {
                      return conn.rollback(function () {
                        conn.release();
                        throw err;
                      });
                    } else {
                      console.log('break 1');
                      console.log(result[0].recommender_id);
                      var PET_history_insert = "";
                      if (result.length > 0) {
                        PET_history_insert += "insert into PET_history (member_no,recommender_id,PET,type,before_PET,after_PET,add_sub) values(?,?,?,?,?,?,?)";
                        var PET_history_datas = [member_no, result[0].recommender_id, rewardPET, 0, PET, afterPET, type];
                      } else {
                        PET_history_insert += "insert into PET_history (member_no,PET,type,before_PET,after_PET,add_sub) values(?,?,?,?,?,?)";
                        var PET_history_datas = [member_no, rewardPET, 0, PET, afterPET, type];
                      }
                      conn.query(PET_history_insert, PET_history_datas, function (err) { //PET내역 추가 sql
                        if (err) {
                          return conn.rollback(function () {
                            conn.release();
                            throw err;
                          });
                        } else {
                          //에어드랍을 계산하는 시점부터 추천인이 존재하지 않을때까지 while 적용
                          //회원의 추천인 전화번호, 추천인의 현재 보유 PET 가져오기
                          var whileSql = "select c.*,ifnull(b.after_PET,0) PET from (select max(a.pet_history_no) latest,a.member_no from PET_history a JOIN member b on a.member_no = b.member_no group by member_no) a JOIN PET_history b ON a.member_no = b.member_no and a.latest = b.pet_history_no RIGHT JOIN member c ON a.member_no = c.member_no where c.member_no = ?";
                          var rewardPET_arr = [];
                          var recommenderInfoArr = [];
                          if (result[0].recommender_no !== null && result[0].recommender_no !== 0) {
                            conn.query(whileSql, result[0].recommender_no, function (err, rows) {
                              if (err) {
                                return conn.rollback(function () {
                                  conn.release();
                                  throw err;
                                });
                              } else {
                                console.log("rows : " + rows[0].recommender_id);
                                if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0) {
                                  recommender_no = rows[0].recommender_no;
                                  recommenderInfoArr.push(rows[0]);
                                  rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                  rewardPET_arr.push(rewardPET);
                                  console.log(rewardPET_arr);
                                  conn.query(whileSql, recommender_no, function (err, rows) {
                                    if (err) {
                                      return conn.rollback(function () {
                                        conn.release();
                                        throw err;
                                      });
                                    } else {
                                      console.log("rows1 : " + rows[0].recommender_id);
                                      if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                        recommender_no = rows[0].recommender_no;
                                        recommenderInfoArr.push(rows[0]);
                                        rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                        rewardPET_arr.push(rewardPET);
                                        console.log(rewardPET_arr);
                                        conn.query(whileSql, recommender_no, function (err, rows) {
                                          if (err) {
                                            return conn.rollback(function () {
                                              conn.release();
                                              throw err;
                                            });
                                          } else {
                                            console.log("rows2 : " + rows[0].recommender_id);
                                            if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                              recommender_no = rows[0].recommender_no;
                                              recommenderInfoArr.push(rows[0]);
                                              rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                              rewardPET_arr.push(rewardPET);
                                              console.log(rewardPET_arr);
                                              conn.query(whileSql, recommender_no, function (err, rows) {
                                                if (err) {
                                                  return conn.rollback(function () {
                                                    conn.release();
                                                    throw err;
                                                  });
                                                } else {
                                                  console.log("rows3 : " + rows[0].recommender_id);
                                                  if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                    recommender_no = rows[0].recommender_no;
                                                    recommenderInfoArr.push(rows[0]);
                                                    rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                    rewardPET_arr.push(rewardPET);
                                                    console.log(rewardPET_arr);
                                                    conn.query(whileSql, recommender_no, function (err, rows) {
                                                      if (err) {
                                                        return conn.rollback(function () {
                                                          conn.release();
                                                          throw err;
                                                        });
                                                      } else {
                                                        console.log("rows4 : " + rows[0].recommender_id);
                                                        if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                          recommender_no = rows[0].recommender_no;
                                                          recommenderInfoArr.push(rows[0]);
                                                          rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                          rewardPET_arr.push(rewardPET);
                                                          console.log(rewardPET_arr);
                                                          conn.query(whileSql, recommender_no, function (err, rows4) {
                                                            if (err) {
                                                              return conn.rollback(function () {
                                                                conn.release();
                                                                throw err;
                                                              });
                                                            } else {
                                                              console.log("rows5 : " + rows4[0].recommender_id);
                                                              if (rows4[0].recommender_no !== null && rows4[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                                recommender_no = rows4[0].recommender_no;
                                                                recommenderInfoArr.push(rows4[0]);
                                                                rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                rewardPET_arr.push(rewardPET);
                                                                console.log(rewardPET_arr);
                                                                conn.query(whileSql, recommender_no, function (err, rows4) {
                                                                  if (err) {
                                                                    return conn.rollback(function () {
                                                                      conn.release();
                                                                      throw err;
                                                                    });
                                                                  } else {
                                                                    console.log("rows6 : " + rows4[0].recommender_id);
                                                                    if (rows4[0].recommender_no !== null && rows4[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                                      recommender_no = rows4[0].recommender_no;
                                                                      recommenderInfoArr.push(rows4[0]);
                                                                      rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                      rewardPET_arr.push(rewardPET);
                                                                      console.log(rewardPET_arr);
                                                                      conn.query(whileSql, recommender_no, function (err, rows4) {
                                                                        if (err) {
                                                                          return conn.rollback(function () {
                                                                            conn.release();
                                                                            throw err;
                                                                          });
                                                                        } else {
                                                                          console.log("rows7 : " + rows4[0].recommender_id);
                                                                          if (rows4[0].recommender_no !== null && rows4[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                                            recommender_no = rows4[0].recommender_no;
                                                                            recommenderInfoArr.push(rows4[0]);
                                                                            rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                            rewardPET_arr.push(rewardPET);
                                                                            console.log(rewardPET_arr);
                                                                            conn.query(whileSql, recommender_no, function (err, rows4) {
                                                                              if (err) {
                                                                                return conn.rollback(function () {
                                                                                  conn.release();
                                                                                  throw err;
                                                                                });
                                                                              } else {
                                                                                console.log("rows8 : " + rows4[0].recommender_id);
                                                                                recommenderInfoArr.push(rows4[0]);
                                                                                rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                                rewardPET_arr.push(rewardPET);
                                                                                console.log(rewardPET_arr);
                                                                                conn.commit(function (err) {
                                                                                  if (err) {
                                                                                    return conn.rollback(function () {
                                                                                      conn.release();
                                                                                      throw err;
                                                                                    });
                                                                                  }
                                                                                  console.log('추천인 select 끝');
                                                                                  conn.release();
                                                                                  doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                                                    if (cb) {
                                                                                      isSuccess = true;
                                                                                      callback(isSuccess);
                                                                                    } else {
                                                                                      callback(isSuccess);
                                                                                    }
                                                                                  });
                                                                                });
                                                                              }
                                                                            });
                                                                          } else {
                                                                            recommenderInfoArr.push(rows4[0]);
                                                                            rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                            rewardPET_arr.push(rewardPET);
                                                                            console.log(rewardPET_arr);
                                                                            conn.commit(function (err) {
                                                                              if (err) {
                                                                                return conn.rollback(function () {
                                                                                  conn.release();
                                                                                  throw err;
                                                                                });
                                                                              }
                                                                              console.log('추천인 select 끝');
                                                                              conn.release();
                                                                              doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                                                if (cb) {
                                                                                  isSuccess = true;
                                                                                  callback(isSuccess);
                                                                                } else {
                                                                                  callback(isSuccess);
                                                                                }
                                                                              });
                                                                            });
                                                                          }
                                                                        }
                                                                      });
                                                                    } else {
                                                                      recommenderInfoArr.push(rows4[0]);
                                                                      rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                      rewardPET_arr.push(rewardPET);
                                                                      console.log(rewardPET_arr);
                                                                      conn.commit(function (err) {
                                                                        if (err) {
                                                                          return conn.rollback(function () {
                                                                            conn.release();
                                                                            throw err;
                                                                          });
                                                                        }
                                                                        console.log('추천인 select 끝');
                                                                        conn.release();
                                                                        doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                                          if (cb) {
                                                                            isSuccess = true;
                                                                            callback(isSuccess);
                                                                          } else {
                                                                            callback(isSuccess);
                                                                          }
                                                                        });
                                                                      });
                                                                    }
                                                                  }
                                                                });
                                                              } else {
                                                                recommenderInfoArr.push(rows4[0]);
                                                                rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                                rewardPET_arr.push(rewardPET);
                                                                console.log(rewardPET_arr);
                                                                conn.commit(function (err) {
                                                                  if (err) {
                                                                    return conn.rollback(function () {
                                                                      conn.release();
                                                                      throw err;
                                                                    });
                                                                  }
                                                                  console.log('추천인 select 끝');
                                                                  conn.release();
                                                                  doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                                    if (cb) {
                                                                      isSuccess = true;
                                                                      callback(isSuccess);
                                                                    } else {
                                                                      callback(isSuccess);
                                                                    }
                                                                  });
                                                                });
                                                              }
                                                            }
                                                          });
                                                        } else {
                                                          recommenderInfoArr.push(rows[0]);
                                                          rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                          rewardPET_arr.push(rewardPET);
                                                          console.log(rewardPET_arr);
                                                          conn.commit(function (err) {
                                                            if (err) {
                                                              return conn.rollback(function () {
                                                                conn.release();
                                                                throw err;
                                                              });
                                                            }
                                                            console.log('추천인 select 끝');
                                                            conn.release();
                                                            doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                              if (cb) {
                                                                isSuccess = true;
                                                                callback(isSuccess);
                                                              } else {
                                                                callback(isSuccess);
                                                              }
                                                            });
                                                          });
                                                        }
                                                      }
                                                    });
                                                  } else {
                                                    recommenderInfoArr.push(rows[0]);
                                                    rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                                    rewardPET_arr.push(rewardPET);
                                                    console.log(rewardPET_arr);
                                                    conn.commit(function (err) {
                                                      if (err) {
                                                        return conn.rollback(function () {
                                                          conn.release();
                                                          throw err;
                                                        });
                                                      }
                                                      console.log('추천인 select 끝');
                                                      conn.release();
                                                      doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                        if (cb) {
                                                          isSuccess = true;
                                                          callback(isSuccess);
                                                        } else {
                                                          callback(isSuccess);
                                                        }
                                                      });
                                                    });
                                                  }
                                                }
                                              });
                                            } else {
                                              recommenderInfoArr.push(rows[0]);
                                              rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                              rewardPET_arr.push(rewardPET);
                                              console.log(rewardPET_arr);
                                              conn.commit(function (err) {
                                                if (err) {
                                                  return conn.rollback(function () {
                                                    conn.release();
                                                    throw err;
                                                  });
                                                }
                                                console.log('추천인 select 끝');
                                                conn.release();
                                                doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                  if (cb) {
                                                    isSuccess = true;
                                                    callback(isSuccess);
                                                  } else {
                                                    callback(isSuccess);
                                                  }
                                                });
                                              });
                                            }
                                          }
                                        });
                                      } else {
                                        recommenderInfoArr.push(rows[0]);
                                        rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                        rewardPET_arr.push(rewardPET);
                                        console.log(rewardPET_arr);
                                        conn.commit(function (err) {
                                          if (err) {
                                            return conn.rollback(function () {
                                              conn.release();
                                              throw err;
                                            });
                                          }
                                          console.log('추천인 select 끝');
                                          conn.release();
                                          doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                            if (cb) {
                                              isSuccess = true;
                                              callback(isSuccess);
                                            } else {
                                              callback(isSuccess);
                                            }
                                          });
                                        });
                                      }
                                    }
                                  });
                                } else {
                                  recommenderInfoArr.push(rows[0]);
                                  rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                  rewardPET_arr.push(rewardPET);
                                  console.log(rewardPET_arr);
                                  conn.commit(function (err) {
                                    if (err) {
                                      return conn.rollback(function () {
                                        conn.release();
                                        throw err;
                                      });
                                    }
                                    console.log('추천인 select 끝');
                                    conn.release();
                                    doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                      if (cb) {
                                        isSuccess = true;
                                        callback(isSuccess);
                                      } else {
                                        callback(isSuccess);
                                      }
                                    });
                                  });
                                }
                              }
                            });
                          } else {
                            conn.commit(function (err) {
                              if (err) {
                                return conn.rollback(function () {
                                  conn.release();
                                  throw err;
                                });
                              }
                              console.log('conn.commit 끝');
                              conn.release();
                              isSuccess = true;
                              callback(isSuccess);
                            });
                          }
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });
}

function doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, callback) {
  var type = type;
  console.log('doubleAirDropFun 안에 들어옴');
  console.log(recommenderInfoArr);
  console.log(rewardPET_arr);
  console.log(type);

  var insertSql = "";
  //'update member set PET = PET + ? where member_id = ?'
  //"insert into PET_history (member_no,recommender_id,PET,type,before_PET,after_PET) values(?,?,?,?,?,?)";

  //for문으로 sql문 만들어서 통째로 insert
  if (type == 0) {    //추가
    for (var i = 0; i < recommenderInfoArr.length; i++) {
      if (rewardPET_arr[i] > 0) {  //0보다 크면 ex : 0.001 sql문 만들기
        var afterPET = (parseFloat(rewardPET_arr[i]) + parseFloat(recommenderInfoArr[i].PET)).toFixed(3);
        //updateSql += "update member set PET = PET + "+rewardPET_arr[i]+" where member_no = "+recommenderInfoArr[i].member_no+";";
        if (recommenderInfoArr[i].recommender_id !== null) {
          insertSql +=
            "insert into PET_history (member_no,recommender_id,PET,type,before_PET,after_PET,add_sub) values(" + recommenderInfoArr[i].member_no + ",'" + recommenderInfoArr[i].recommender_id + "'," + rewardPET_arr[i] + "," + 1 + "," + recommenderInfoArr[i].PET + "," + afterPET + "," + type + ");";
        } else {
          insertSql +=
            "insert into PET_history (member_no,PET,type,before_PET,after_PET,add_sub) values(" + recommenderInfoArr[i].member_no + "," + rewardPET_arr[i] + "," + 1 + "," + recommenderInfoArr[i].PET + "," + afterPET + "," + type + ");";
        }
      } else {
        break;
      }
    }
  } else {            //차감
    for (var i = 0; i < recommenderInfoArr.length; i++) {
      if (rewardPET_arr[i] > 0) {  //0보다 크면 ex : 0.001 sql문 만들기
        var afterPET = (parseFloat(recommenderInfoArr[i].PET) - parseFloat(rewardPET_arr[i])).toFixed(3);
        //updateSql += "update member set PET = PET - "+rewardPET_arr[i]+" where member_no = "+recommenderInfoArr[i].member_no+";";
        if (recommenderInfoArr[i].recommender_id !== null) {
          insertSql +=
            "insert into PET_history (member_no,recommender_id,PET,type,before_PET,after_PET,add_sub) values(" + recommenderInfoArr[i].member_no + ",'" + recommenderInfoArr[i].recommender_id + "'," + rewardPET_arr[i] + "," + 1 + "," + recommenderInfoArr[i].PET + "," + afterPET + "," + type + ");";
        } else {
          insertSql +=
            "insert into PET_history (member_no,PET,type,before_PET,after_PET,add_sub) values(" + recommenderInfoArr[i].member_no + "," + rewardPET_arr[i] + "," + 1 + "," + recommenderInfoArr[i].PET + "," + afterPET + "," + type + ");";
        }
      } else {
        break;
      }
    }
  }
  console.log(insertSql);
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(insertSql, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            console.log('더블에어드랍 끝');
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
}

// 사이트관리 정보수정
exports.settingModify = settingModify;
function settingModify(datas, callback) {
  var isSuccess = false;
  var sqlDatas = [datas[0], datas[1], datas[2]];
  var sql =
    "update PET_setting set PET_price = ?, major_member_balance = ?, team_member_balance = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sql, sqlDatas, function (err, result) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
}

// 회원 보유 PET 호출
exports.getUserPET = getUserPET;
function getUserPET(member_no, callback) {
  var contentObj = { isSuccess: false, PET: "" };
  var member_no = member_no;
  var sql =
    "select after_PET from PET_history where member_no = ? order by pet_history_no desc limit 1";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sql, member_no, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          if (row.length > 0) {
            contentObj.PET = row[0].after_PET;
          } else {
            contentObj.PET = 0;
          }
          conn.release();
          contentObj.isSuccess = true;
          callback(contentObj);
        }
      });
    });
  });
}

// PET 내역
exports.getPET_list = getPET_list;
function getPET_list(datas, callback) {

  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];

  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };
  console.log(selectVal, page, searchVal, searchSelectVal);
  var sql = "";
  var sqlCount = "";

  if (selectVal !== "-") {
    //등급 선택
    sql += "select a.*,b.member_id,b.member_name from PET_history a join member b on a.member_no = b.member_no where 1=1 and add_sub = " + selectVal;
    sqlCount +=
      "select count(*) cnt from PET_history a join member b on a.member_no = b.member_no where 1=1 and add_sub = " +
      selectVal;
  } else {
    //전체 목록
    sql += "select a.*,b.member_id,b.member_name from PET_history a join member b on a.member_no = b.member_no where 1=1 ";
    sqlCount += "select count(*) cnt from PET_history a join member b on a.member_no = b.member_no where 1=1 ";
  }
  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id = '" + searchVal + "' ";
    sqlCount += " and member_id = '" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by pet_history_no desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    })
  });
}

//내 수당 정보
// exports.myInfo = myInfo;
// function myInfo(datas, callback) {
//   var page = datas[0];
//   var searchVal = datas[1];
//   var searchSelectVal = datas[2];

//   var contentsObj = {
//     contents: "",
//     pageSize: "",
//     startPage: "",
//     endPage: "",
//     totalPage: "",
//     max: "",
//     totalCount: "",
//     isSuccess: false
//   };

//   var sql = "";
//   var sqlCount = "";
//   //전체 목록
//   sql += "select a.member_id,a.member_name,c.airdrop,d.doubleAirdrop,e.adminBonus,b.member_no,b.after_PET,a.latest from (select max(a.pet_history_no) latest,a.*,b.member_name,b.member_id from PET_history a JOIN member b on a.member_no = b.member_no group by member_no) a JOIN PET_history b ON a.member_no = b.member_no" +
//     ' LEFT JOIN (select sum(PET) airdrop,member_no from PET_history where type = 0 and add_sub = 0 group by member_no) c on a.member_no = c.member_no' +
//     ' LEFT JOIN (select sum(truncate(PET,3)) doubleAirdrop,member_no from PET_history where type = 1 and add_sub = 0 group by member_no) d on a.member_no = d.member_no' +
//     ' LEFT JOIN (select sum(PET) adminBonus,member_no from PET_history where type = 2 and add_sub = 0 group by member_no) e on a.member_no = e.member_no where 1=1 and a.latest = b.pet_history_no ';
//   sqlCount += "select count(*) cnt from (select max(a.pet_history_no) latest,a.*,b.member_name,b.member_id from PET_history a JOIN member b on a.member_no = b.member_no group by member_no) a JOIN PET_history b ON a.member_no = b.member_no " +
//     ' LEFT JOIN (select sum(PET) airdrop,member_no from PET_history where type = 0 and add_sub = 0 group by member_no) c on a.member_no = c.member_no ' +
//     ' LEFT JOIN (select sum(truncate(PET,3)) doubleAirdrop,member_no from PET_history where type = 1 and add_sub = 0 group by member_no) d on a.member_no = d.member_no' +
//     ' LEFT JOIN (select sum(PET) adminBonus,member_no from PET_history where type = 2 and add_sub = 0 group by member_no) e on a.member_no = e.member_no where 1=1 and a.latest = b.pet_history_no ';

//   if (searchSelectVal === "1") {
//     //아이디 검색
//     sql += " and member_id like '%" + searchVal + "%' ";
//     sqlCount += " and member_id like '%" + searchVal + "%' ";
//   } else if (searchSelectVal === "2") {
//     //이름 검색
//     sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
//     sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
//   } else {
//     //전체 검색
//     if (searchVal !== "") {
//       sql +=
//         " and (member_id like '%" +
//         searchVal +
//         "%' or member_name = '" +
//         enDec.seedEncrytion(searchVal) +
//         "' )";
//       sqlCount +=
//         " and (member_id like '%" +
//         searchVal +
//         "%' or member_name = '" +
//         enDec.seedEncrytion(searchVal) +
//         "' )";
//     }
//   }

//   sql += " group by a.member_no order by latest desc ";
//   sql += " limit ?,?";

//   console.log(sql);
//   var size = 10; // 한 페이지에 10개의 글을 보여준다.
//   var begin = (page - 1) * size; // 시작 글
//   pool.getConnection(function (err, conn) {
//     if (err) throw err;
//     conn.beginTransaction(function (err) {
//       if (err) throw err;
//       conn.query(sqlCount, function (err, countRows) {
//         if (err) {
//           console.error("err", err);
//           callback(contentsObj);
//           conn.release();
//         } else {
//           conn.query(sql, [begin, size], function (err, rows) {
//             if (err) {
//               console.error("err", err);
//               callback(contentsObj);
//               conn.release();
//             } else {
//               var cnt = countRows[0].cnt; // 전체 글의 수
//               var totalPage = Math.ceil(cnt / size); // 총 페이지 수
//               var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
//               var currentBlock = Math.ceil(page / pageSize);
//               var startPage = (currentBlock - 1) * pageSize + 1;
//               var endPage = startPage + (pageSize - 1);
//               if (endPage > totalPage) {
//                 // 예) 20 > 총 17페이지
//                 endPage = totalPage;
//               }
//               var max = cnt - (page - 1) * size;
//               for (var i = 0; i < rows.length; i++) {
//                 rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
//               }
//               contentsObj.pageSize = pageSize;
//               contentsObj.startPage = startPage;
//               contentsObj.endPage = endPage;
//               contentsObj.totalPage = totalPage;
//               contentsObj.max = max;
//               contentsObj.totalCount = cnt;
//               contentsObj.isSuccess = true;
//               contentsObj.contents = rows;
//               callback(contentsObj);
//               conn.release();
//             }
//           });
//         }
//       });
//     });
//   });
// }

// 매출 내역
exports.depositList = depositList;
function depositList(datas, callback) {
  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];

  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";

  if (selectVal !== "-") {
    //등급 선택
    sql += "SELECT a.*,b.member_id,b.member_name FROM deposit_history a JOIN member b ON a.member_no = b.member_no where 1=1 and type = " + selectVal;
    sqlCount +=
      "select count(*) cnt from deposit_history a join member b on a.member_no = b.member_no where 1=1 and type = " +
      selectVal;
  } else {
    //전체 목록
    sql += "select a.*,b.member_id,b.member_name from deposit_history a join member b on a.member_no = b.member_no where 1=1 ";
    sqlCount += "select count(*) cnt from deposit_history a join member b on a.member_no = b.member_no where 1=1 ";
  }
  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id = '" + searchVal + "' ";
    sqlCount += " and member_id = '" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by deposit_history_no desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}

// 매출 대기 내역
exports.depositStandBy = depositStandBy;
function depositStandBy(datas, callback) {
  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];

  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";

  if (selectVal !== "-") {
    //등급 선택
    sql += "SELECT a.*,b.member_id,b.member_name,b.member_grade FROM deposit_stand_by a JOIN member b ON a.member_no = b.member_no where 1=1 and deposit_complete = " + selectVal;
    sqlCount +=
      "select count(*) cnt from deposit_stand_by a join member b on a.member_no = b.member_no where 1=1 and deposit_complete = " +
      selectVal;
  } else {
    //전체 목록
    sql += "select a.*,b.member_id,b.member_name,b.member_grade from deposit_stand_by a join member b on a.member_no = b.member_no where 1=1 ";
    sqlCount += "select count(*) cnt from deposit_stand_by a join member b on a.member_no = b.member_no where 1=1 ";
  }
  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id like '%" + searchVal + "%' ";
    sqlCount += " and member_id like '%" + searchVal + "%' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id like '%" +
        searchVal +
        "%' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id like '%" +
        searchVal +
        "%' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by reg_date desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}


// main 회원 목록
exports.getIndexUserList = getIndexUserList;
function getIndexUserList(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false,
    cnt: "",
    todayCnt: "",
    todayPETprice: ""
  };

  var sql = "select a.*,b.member_name recommender_name from member a LEFT JOIN member b on a.recommender_id = b.member_id where a.member_no > 1 order by a.reg_date desc limit 0,5";
  //최근 가입 회원 5명
  var sqlCount = "select count(*) cnt from member";                                         //총 회원수
  var todayCount = "select count(*) todayCnt from member where DATE(reg_date) = curdate()";      //금일 가입 회원 수
  var todayPETprice = "select PET_price from PET_setting"
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(todayPETprice, function (err, price) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              conn.query(sqlCount, function (err, row) {
                if (err) {
                  console.error("err", err);
                  callback(contentsObj);
                  conn.release();
                } else {
                  conn.query(todayCount, function (err, row2) {
                    if (err) {
                      console.error("err", err);
                      callback(contentsObj);
                      conn.release();
                    } else {
                      if (rows.length > 0) {
                        rows.forEach(function (item, idx) {
                          item.member_name = enDec.seedDecrytion(item.member_name);
                          if (item.recommender_name !== null) {
                            item.recommender_name = enDec.seedDecrytion(item.recommender_name);
                          }
                        });
                      }
                      contentsObj.todayPETprice = price[0].PET_price;
                      contentsObj.isSuccess = true;
                      contentsObj.cnt = row[0].cnt;
                      contentsObj.todayCnt = row2[0].todayCnt;
                      contentsObj.contents = rows;
                      callback(contentsObj);
                      conn.release();
                    }
                  })
                }
              })
            }
          });
        }
      });
    });
  });
}

// 메인화면 매출 내역
exports.getIndexDepositList = getIndexDepositList;
function getIndexDepositList(callback) {

  var contentsObj = {
    contents: "",
    toalDeposit: "",
    totalDepositToday: "",
    isSuccess: false,
    lastDepositDate: ""
  };

  var sql = "select a.*,b.member_id,b.member_name from deposit_history a JOIN member b ON a.member_no = b.member_no where 1=1 order by a.reg_date desc limit 0,5";
  var totalDepositSql = "SELECT ifnull(current_week_deposit,0) totalDeposit FROM deposit_week";                                         //현 매출액
  var lastDepositDate = "SELECT date_format(max(reg_date), '%Y-%m-%d') reg_date FROM IR_CMS.calculate_history";
  var totalDepositTodaySql = "select sum(deposit) totalDepositToday from deposit_history where DATE(reg_date) = curdate()";      //금일 매출액


  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(totalDepositSql, function (err, row1) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              conn.query(totalDepositTodaySql, function (err, row2) {
                if (err) {
                  console.error("err", err);
                  callback(contentsObj);
                  conn.release();
                } else {
                  conn.query(lastDepositDate, function (err, row3) {
                    if (err) {
                      console.error("err", err);
                      callback(contentsObj);
                      conn.release();
                    } else {
                      for (var i = 0; i < rows.length; i++) {
                        rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
                      }
                      contentsObj.totalDeposit = row1[0].totalDeposit;
                      contentsObj.totalDepositToday = row2[0].totalDepositToday;
                      contentsObj.lastDepositDate = row3[0].reg_date;
                      contentsObj.isSuccess = true;
                      contentsObj.contents = rows;
                      callback(contentsObj);
                      conn.release();
                    }
                  });
                }
              });
            }
          });
        }
      });
    })
  });
}

// 메인화면 PET 내역
exports.getIndexPETList = getIndexPETList;
function getIndexPETList(callback) {

  var contentsObj = {
    contents: "",
    allProvidePET: "",
    allAirDropPET: "",
    todayProvidePET: "",
    todayAirDropPET: "",
    isSuccess: false
  };

  var sql = "select a.*,b.member_id,b.member_name,c.member_name recommender_name from PET_history a JOIN member b ON a.member_no = b.member_no LEFT JOIN member c ON b.recommender_id = c.member_id where 1=1 order by a.pet_history_no desc limit 0,5";
  var allProvidePETSql = "select ifnull(sum(truncate(PET,3)),0) addAllProvidePET from PET_history where type <> 1 and add_sub = 0;select ifnull(sum(truncate(PET,3)),0) subAllProvidePET from PET_history where type <> 1 and add_sub = 1;";                                         //총 지급 PET
  var allAirDropPETSql = "select ifnull(sum(truncate(PET,3)),0) addAllAirDropPET from PET_history where type = 1 and add_sub = 0;select ifnull(sum(truncate(PET,3)),0) subAllAirDropPET from PET_history where type = 1 and add_sub = 1;";      //총 에어드랍 PET
  var todayProvidePETSql = "select ifnull(sum(truncate(PET,3)),0) addTodayProvidePET from PET_history where type <> 1 and DATE(reg_date) = curdate() and add_sub = 0;select ifnull(sum(truncate(PET,3)),0) subTodayProvidePET from PET_history where type <> 1 and DATE(reg_date) = curdate() and add_sub = 1;";      //금일 지금 PET
  var todayAirDropPETSql = "select ifnull(sum(truncate(PET,3)),0) addTodayAirDropPET from PET_history where type = 1 and DATE(reg_date) = curdate() and add_sub = 0;select ifnull(sum(truncate(PET,3)),0) subTodayAirDropPET from PET_history where type = 1 and DATE(reg_date) = curdate() and add_sub = 1;";      //금일 에어드랍 PET


  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(allProvidePETSql, function (err, row1) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              conn.query(allAirDropPETSql, function (err, row2) {
                if (err) {
                  console.error("err", err);
                  callback(contentsObj);
                  conn.release();
                } else {
                  conn.query(todayProvidePETSql, function (err, row3) {
                    if (err) {
                      console.error("err", err);
                      callback(contentsObj);
                      conn.release();
                    } else {
                      conn.query(todayAirDropPETSql, function (err, row4) {
                        if (err) {
                          console.error("err", err);
                          callback(contentsObj);
                          conn.release();
                        } else {
                          if (rows.length > 0) {
                            rows.forEach(function (item, idx) {
                              item.member_name = enDec.seedDecrytion(item.member_name);
                              if (item.recommender_name !== null) {
                                item.recommender_name = enDec.seedDecrytion(item.recommender_name);
                              }
                            });
                          }

                          contentsObj.allProvidePET = ((row1[0][0].addAllProvidePET * 1) - (row1[1][0].subAllProvidePET * 1)).toFixed(3);
                          contentsObj.allAirDropPET = ((row2[0][0].addAllAirDropPET * 1) - (row2[1][0].subAllAirDropPET * 1)).toFixed(3);
                          contentsObj.todayProvidePET = ((row3[0][0].addTodayProvidePET * 1) - (row3[1][0].subTodayProvidePET * 1)).toFixed(3);
                          contentsObj.todayAirDropPET = ((row4[0][0].addTodayAirDropPET * 1) - (row4[1][0].subTodayAirDropPET * 1)).toFixed(3);
                          contentsObj.isSuccess = true;
                          contentsObj.contents = rows;
                          callback(contentsObj);
                          conn.release();
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });
}

// 금일 매출액 가져오기 [수당 자동계산 기능]
exports.getTodayDeposit = getTodayDeposit;
function getTodayDeposit(callback) {
  var contentObj = { isSuccess: false, todayDeposit: 0, holdPET: 0 };
  var todayDepositSql =
    "select ifnull(sum(deposit),0) todayDeposit from deposit_history where DATE(reg_date) = curdate()";  //당일 하루의 매출액 호출
  var majorHoldPET = "select ifnull(sum(after_PET),0) majorPET from PET_history a JOIN (select member_no,max(pet_history_no) latest from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no LEFT JOIN member c on a.member_no = c.member_no where c.member_grade = 2;select ifnull(sum(after_PET),0) teamPET from PET_history a JOIN (select member_no,max(pet_history_no) latest from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no LEFT JOIN member c on a.member_no = c.member_no where c.member_grade = 3;";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      console.log("당일 매출액 호출");
      console.log(todayDepositSql);
      conn.query(todayDepositSql, function (err, result) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          console.log("전체 정회원, 전체 준회원 보유 PET 호출");
          conn.query(majorHoldPET, function (err, row) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              console.log(result);
              console.log(row);
              conn.release();
              contentObj.isSuccess = true;
              contentObj.todayDeposit = result[0].todayDeposit * 1;
              contentObj.holdPET = row;
              callback(contentObj);
            }
          });
        }
      });
    });
  });
}

// 수당 내역 추가 [수당 자동 계산기]
exports.benefitHistory = benefitHistory;
function benefitHistory(datas, callback) {
  var isSuccess = false;
  var petHoldMemberSql = "select c.member_no,c.member_grade,c.benefit,after_PET from PET_history a JOIN (select member_no,max(pet_history_no) latest from PET_history group by member_no) b on a.pet_history_no = b.latest and a.member_no = b.member_no LEFT JOIN member c on a.member_no = c.member_no where a.member_no <> 0 and after_PET > 0 ";

  var insertSql = "";
  var updateSql = "";
  var majorBenefitUnit = datas[0] * 1;
  var teamBenefitUnit = datas[1] * 1;
  console.log("수당 자동 계산기 in");
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(petHoldMemberSql, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          console.log('PET을 1이상 보유한 임직원 호출');
          if (row.length > 0) {
            //console.log(row);
            row.forEach(function (item) {
              var before_benefit = (item.benefit * 1);
              if (item.member_grade == 2) {         //정회원 1PET당 수당 * 정회원 보유 PET
                var benefit = ((majorBenefitUnit * item.after_PET)).toFixed(3);
              } else if (item.member_grade == 3) {   //준회원 1PET당 수당 * 준회원 보유 PET
                var benefit = ((teamBenefitUnit * item.after_PET)).toFixed(3);
              }
              if (benefit > 0) {  //수당이 0 이상일때만 수당내역에 추가
                var after_benefit = ((before_benefit * 1) + (benefit * 1)).toFixed(3);
                insertSql += 'insert into benefit_history (member_no,before_benefit,benefit,after_benefit,type) values(' + item.member_no + ',' + before_benefit + ',' + benefit + ',' + after_benefit + ',0);';
                updateSql += 'update member set benefit = ' + after_benefit + ' where member_no = ' + item.member_no + ";";
              }
            });
            console.log("수당 내역 insert");
            console.log(insertSql);

            console.log("member 수당 update");
            console.log(updateSql);
            conn.query(insertSql, function (err) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              } else {
                conn.query(updateSql, function (err) {
                  if (err) {
                    return conn.rollback(function () {
                      conn.release();
                      throw err;
                    });
                  } else {
                    conn.commit(function (err) {
                      if (err) {
                        return conn.rollback(function () {
                          conn.release();
                          throw err;
                        });
                      }
                      conn.release();
                      isSuccess = true;
                      callback(isSuccess);
                    });
                  }
                });
              }
            });
          } else {
            conn.release();
            callback(isSuccess);
          }
        }
      });
    });
  });
};

// 수당 내역
exports.getBenefitList = getBenefitList;
function getBenefitList(datas, callback) {
  var page = datas[0];
  var searchVal = datas[1];
  var searchSelectVal = datas[2];
  var receptionDate = datas[3];
  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";


  //전체 목록
  sql += "select a.*,500 charge,(a.after_benefit*0.033) tax,if((a.after_benefit*0.967)-500 > 0,(a.after_benefit*0.967)-500 ,0) truth_benefit,b.member_id,b.member_name from benefit_history a join member b on a.member_no = b.member_no where 1=1 ";
  sqlCount += "select count(*) cnt from benefit_history a join member b on a.member_no = b.member_no where 1=1 ";

  if (receptionDate != "") {
    var receptionDateArray = receptionDate.split(" ~ ");
    sql += " AND DATE(a.reg_date) BETWEEN '" + receptionDateArray[0] + "' AND '" + receptionDateArray[1] + "'";
    sqlCount += " AND DATE(a.reg_date) BETWEEN '" + receptionDateArray[0] + "' AND '" + receptionDateArray[1] + "'";
  }

  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id = '" + searchVal + "' ";
    sqlCount += " and member_id = '" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by a.reg_date desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          console.log(sql);
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}

// 수당 내역엑셀 다운로드
exports.getBenefitListXlsx = getBenefitListXlsx;
function getBenefitListXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select a.*,500 charge,TRUNCATE((a.after_benefit*0.033),3) tax,TRUNCATE(if((a.after_benefit*0.967)-500 > 0,(a.after_benefit*0.967)-500 ,0),3) truth_benefit,b.member_id,b.member_name from benefit_history a join member b on a.member_no = b.member_no where 1=1  order by a.reg_date desc ";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
          }
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// 출금 승인 내역엑셀 다운로드
exports.getWithdrawListXlsx = getWithdrawListXlsx;
function getWithdrawListXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select a.*,500 charge,TRUNCATE((a.after_benefit*0.033),3) tax,TRUNCATE(if((a.after_benefit*0.967)-500 > 0,(a.after_benefit*0.967)-500 ,0),3) truth_benefit,b.member_id,b.member_name from benefit_history a join member b on a.member_no = b.member_no where 1=1  order by a.reg_date desc ";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
          }
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// PET 내역엑셀 다운로드
exports.getPET_listXlsx = getPET_listXlsx;
function getPET_listXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select a.*,b.member_id,b.member_name from PET_history a join member b on a.member_no = b.member_no where 1=1 order by pet_history_no desc ";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
          }
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// 매출 내역엑셀 다운로드
exports.getDepositListXlsx = getDepositListXlsx;
function getDepositListXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select a.*,b.member_id,b.member_name from deposit_history a join member b on a.member_no = b.member_no where 1=1 order by reg_date desc ";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
          }
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// 정산 내역엑셀 다운로드
exports.getCalculateListXlsx = getCalculateListXlsx;
function getCalculateListXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select b.member_id,b.member_name,b.member_personal_number,truncate(a.withdraw_price,3) before_benefit, truncate((a.withdraw_price * 0.03),3) tax1, truncate((a.withdraw_price * 0.003),3) tax2, 500 tax3,(truncate((a.withdraw_price * 0.03),3)+truncate((a.withdraw_price * 0.003),3)+500) total_tax,truncate(truth_benefit,3) truth_benefit,b.bank_code,b.bank_name,b.account_number,b.account_holder,a.reg_date from calculate_history a join member b on a.member_no = b.member_no where 1=1 order by reg_date desc ";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
            rows[i].member_personal_number = enDec.seedDecrytion(rows[i].member_personal_number);
            rows[i].account_number = enDec.seedDecrytion(rows[i].account_number);
            rows[i].account_holder = enDec.seedDecrytion(rows[i].account_holder);
          }
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}


// 회원 정보 엑셀 다운로드
exports.getUserListXlsx = getUserListXlsx;
function getUserListXlsx(callback) {
  var contentsObj = {
    contents: "",
    isSuccess: false
  };
  var sql = "";
  //전체 목록
  sql += "select c.member_no,c.member_id,c.member_name,c.member_personal_number,c.member_grade,ifnull(a.after_PET,0) PET,ifnull(b.after_benefit,0) benefit,c.bank_name,c.account_number,c.account_holder,c.reg_date from (select a.* from PET_history a JOIN (select member_no,max(pet_history_no) latest from PET_history group by member_no)b on a.pet_history_no = b.latest and a.member_no = b.member_no) a LEFT JOIN (select a.* from benefit_history a join (select member_no,max(benefit_history_no) latest from benefit_history group by member_no)b on a.benefit_history_no = b.latest and a.member_no = b.member_no) b on a.member_no = b.member_no RIGHT JOIN member c on a.member_no = c.member_no where 1=1 and c.member_no <> 0 order by c.member_no desc";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      console.log(sql);
      conn.query(sql, function (err, rows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          for (var i = 0; i < rows.length; i++) {
            rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
            rows[i].member_personal_number = enDec.seedDecrytion(rows[i].member_personal_number);
            rows[i].account_number = enDec.seedDecrytion(rows[i].account_number);
            rows[i].account_holder = enDec.seedDecrytion(rows[i].account_holder);
          }
          //console.log(rows);
          contentsObj.isSuccess = true;
          contentsObj.contents = rows;
          callback(contentsObj);
          conn.release();
        }
      });
    });
  });
}

// 정산 버튼 클릭(정산 내역 추가) [엑셀 다운로드]
// ※현 매출액 = 현 매출액 - 정산된 총액 
exports.calculateAdd = calculateAdd;
function calculateAdd(callback) {
  var isSuccess = false;
  // 수당이 0 이상인 사람들의 최근 수당을 가져옴 -> 출금 대기내역에서 complete가 1이고, over가 0인 글들을 가져옴
  var withdrawUpdate = "select a.withdraw_stand_by_no,b.member_no,truncate(a.withdraw,3) withdraw,truncate(b.benefit,3) after_benefit,truncate((a.withdraw*0.033)+500,3) tax, truncate(if((a.withdraw*0.967)-500 > 0,(a.withdraw*0.967)-500 ,0),3) truth_benefit from withdraw_stand_by a LEFT JOIN member b on a.member_no = b.member_no where withdraw_complete = 1 and withdraw_over = 0 ";


  var sql = "select b.member_no,truncate(sum(a.withdraw),3) withdraw,truncate(b.benefit,3) after_benefit,truncate(sum((a.withdraw*0.033)+500),3) tax, truncate(if(sum((a.withdraw*0.967)-500) > 0,sum((a.withdraw*0.967)-500) ,0),3) truth_benefit from withdraw_stand_by a LEFT JOIN member b on a.member_no = b.member_no where withdraw_complete = 1 and withdraw_over = 0 group by a.member_no ";

  // 승인 상태에 미출금인 출금 신청액의 총합산 == 정산금액
  var withdraw_complete_sql = "select ifnull(sum(withdraw),0) withdraw from withdraw_stand_by where withdraw_complete = 1 and withdraw_over = 0";
  var weekDepositReset = "update deposit_week set current_week_deposit = current_week_deposit - ?";  //현 매출액 - 정산금액
  var benefitSql = "", calculateSql = "", updateSql = "";

  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sql, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          if (row.length > 0) {
            console.log(row);
            row.forEach(function (item, idx) {
              var after_benefit = parseFloat(item.after_benefit);   //현재 회원의 보유 수당
              var withdraw = parseFloat(item.withdraw);             //중복 출금 신청자 총 합산금액
              var tax = parseFloat(item.tax);                       //중복 출금 신청자 총 세금
              var truth_benefit = parseFloat(item.truth_benefit);   //중복 출금 신청자 총 실지급액
              //수당 내역 추가 (member benefit은 이미 차감했으니, 차감한 내역을 수당내역에 추가))
              benefitSql += 'insert into benefit_history (member_no,before_benefit,benefit,after_benefit,type) values(' + item.member_no + ',' + (after_benefit + withdraw) + ',' + withdraw + ',' + after_benefit + ', 1);';

              //정산 내역 추가
              calculateSql += 'insert into calculate_history (member_no,before_benefit,tax,truth_benefit,after_benefit,withdraw_price) values(' + item.member_no + ',' + (after_benefit + withdraw) + ',' + tax + ',' + truth_benefit + ',' + after_benefit + ',' + (truth_benefit + tax) + ');';
            });

            console.log(calculateSql);
            conn.query(withdrawUpdate, function (err, row2) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              } else {
                if (row2.length > 0) {
                  row2.forEach(function (item, idx) {
                    //출금 대기내역 업데이트 over 0 ->1
                    updateSql += 'update withdraw_stand_by set withdraw_over = 1 where withdraw_stand_by_no = ' + item.withdraw_stand_by_no + ";";
                  });
                }
                conn.query(calculateSql, function (err) {
                  if (err) {
                    return conn.rollback(function () {
                      conn.release();
                      throw err;
                    });
                  } else {
                    conn.query(benefitSql, function (err) {
                      if (err) {
                        return conn.rollback(function () {
                          conn.release();
                          throw err;
                        });
                      } else {
                        conn.query(withdraw_complete_sql, function (err, result) {
                          if (err) {
                            return conn.rollback(function () {
                              conn.release();
                              throw err;
                            });
                          } else {
                            if (result.length > 0) {
                              var withdraw_price = result[0].withdraw * 1;
                              conn.query(weekDepositReset, withdraw_price, function (err) {
                                if (err) {
                                  return conn.rollback(function () {
                                    conn.release();
                                    throw err;
                                  });
                                } else {
                                  conn.query(updateSql, function (err) {
                                    if (err) {
                                      return conn.rollback(function () {
                                        conn.release();
                                        throw err;
                                      });
                                    } else {
                                      conn.commit(function (err) {
                                        if (err) {
                                          return conn.rollback(function () {
                                            conn.release();
                                            throw err;
                                          });
                                        }
                                        conn.release();
                                        isSuccess = true;
                                        callback(isSuccess);
                                      });
                                    }
                                  });
                                }
                              });
                            } else {
                              conn.release();
                              callback(isSuccess);
                            }
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          } else {
            conn.release();
            callback(isSuccess);
          }
        }
      });
    });
  });
};

// 정산 내역
exports.getCalculateList = getCalculateList;
function getCalculateList(datas, callback) {
  var page = datas[0];
  var searchVal = datas[1];
  var searchSelectVal = datas[2];
  var receptionDate = datas[3];
  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";


  //전체 목록
  sql += "select a.*,b.member_id,b.member_name from calculate_history a join member b on a.member_no = b.member_no where 1=1 and a.truth_benefit > 0 ";
  sqlCount += "select count(*) cnt from calculate_history a join member b on a.member_no = b.member_no where 1=1 ";

  if (receptionDate != "") {
    var receptionDateArray = receptionDate.split(" ~ ");
    sql += " AND DATE(a.reg_date) BETWEEN '" + receptionDateArray[0] + "' AND '" + receptionDateArray[1] + "'";
    sqlCount += " AND DATE(a.reg_date) BETWEEN '" + receptionDateArray[0] + "' AND '" + receptionDateArray[1] + "'";
  }

  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id = '" + searchVal + "' ";
    sqlCount += " and member_id = '" + searchVal + "' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id = '" +
        searchVal +
        "' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by a.reg_date desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          console.log(sql);
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}

// memberId 여부 체크
exports.memberIdCheck = memberIdCheck;
function memberIdCheck(datas, callback) {
  var memberId = datas[0];
  var type = datas[1];
  var cur_member_no = datas[2];
  var contentObj = { hasMemberId: false, msg: "" };

  pool.getConnection(function (err, conn) {
    if (err) console.error('err', err);
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query('SELECT COUNT(*) cnt FROM member WHERE member_id=?', memberId, function (err, result) {
        if (err) console.error('err', err);
        result[0].cnt = result[0].cnt * 1;
        if (type === "1") {
          if (result[0].cnt == 1) {
            //이미 있는 아이디
            contentObj.hasMemberId = true;
            contentObj.msg = "* 이미 사용중인 아이디 입니다";
          }
          callback(contentObj);
          conn.release();
        } else if (type === "2") {
          if (result[0].cnt == 0) {
            //추천인 없음
            contentObj.hasMemberId = true;
            contentObj.msg = "* 해당 추천인이 존재하지 않습니다";
            callback(contentObj);
            conn.release();
          } else {
            //추천인이 있음
            //추천인의 시리얼넘버를 가져와서 
            //내 멤버 번호가 들어가 있는지 확인해야함
            conn.query('SELECT serial_key FROM member WHERE member_id=?', memberId, function (err, row) {
              if (err) throw err;
              console.log(row[0].serial_key);
              console.log(cur_member_no);
              if (row[0].serial_key.indexOf(cur_member_no + ".") !== -1) {
                //내 하위계정을 추천인으로 둘 수 없음
                contentObj.hasMemberId = true;
                contentObj.msg = "* 하위 회원을 추천인으로 선택할 수 없습니다";
                callback(contentObj);
                conn.release();
              } else {
                //추천인 등록 가능
                callback(contentObj);
                conn.release();
              }
            })
          }
        }
      });
    });
  });
}

// 출금 대기내역 추가
exports.addWithdrawStanby = addWithdrawStanby;
function addWithdrawStanby(datas, callback) {
  var isSuccess = false;
  var insertSql = "insert into withdraw_stand_by (member_no,withdraw) values(?,?)";
  var updateSql = "update member set benefit =  truncate(benefit - ?,3) where member_no = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(insertSql, datas, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.query(updateSql, [datas[1], datas[0]], function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              conn.commit(function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                }
                conn.release();
                isSuccess = true;
                callback(isSuccess);
              });
            }
          });
        }
      });
    });
  });
};

// 출금 대기 내역 목록
exports.withdrawStandBy = withdrawStandBy;
function withdrawStandBy(datas, callback) {
  var selectVal = datas[0];
  var page = datas[1];
  var searchVal = datas[2];
  var searchSelectVal = datas[3];

  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";

  if (selectVal !== "-") {
    //등급 선택
    sql += "SELECT a.*,b.member_id,b.member_name,b.member_grade FROM withdraw_stand_by a JOIN member b ON a.member_no = b.member_no where 1=1 and withdraw_over = 0 and withdraw_complete = " + selectVal;
    sqlCount +=
      "select count(*) cnt from withdraw_stand_by a join member b on a.member_no = b.member_no where 1=1 and withdraw_over = 0 and withdraw_complete = " +
      selectVal;
  } else {
    //전체 목록
    sql += "SELECT a.*,b.member_id,b.member_name,b.member_grade FROM withdraw_stand_by a JOIN member b ON a.member_no = b.member_no where 1=1 and withdraw_over = 0 ";
    sqlCount += "select count(*) cnt from withdraw_stand_by a join member b on a.member_no = b.member_no where 1=1 and withdraw_over = 0 ";
  }
  if (searchSelectVal === "1") {
    //아이디 검색
    sql += " and member_id like '%" + searchVal + "%' ";
    sqlCount += " and member_id like '%" + searchVal + "%' ";
  } else if (searchSelectVal === "2") {
    //이름 검색
    sql += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
    sqlCount += " and member_name = '" + enDec.seedEncrytion(searchVal) + "' ";
  } else {
    //전체 검색
    if (searchVal !== "") {
      sql +=
        " and (member_id like '%" +
        searchVal +
        "%' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
      sqlCount +=
        " and (member_id like '%" +
        searchVal +
        "%' or member_name = '" +
        enDec.seedEncrytion(searchVal) +
        "' )";
    }
  }

  sql += " order by reg_date desc ";
  sql += " limit ?,?";
  var size = 10; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sqlCount, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(sql, [begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}

// 내 출금 내역 목록
exports.myWithdrawHistory = myWithdrawHistory;
function myWithdrawHistory(datas, callback) {
  var page = datas[0];
  var member_no = datas[1];
  var contentsObj = {
    contents: "",
    pageSize: "",
    startPage: "",
    endPage: "",
    totalPage: "",
    max: "",
    totalCount: "",
    isSuccess: false
  };

  var sql = "";
  var sqlCount = "";
  sql += "SELECT a.*,b.member_id,b.member_name,b.member_grade FROM withdraw_stand_by a JOIN member b ON a.member_no = b.member_no where 1=1 and b.member_no = ? ";
  sqlCount += "select count(*) cnt from withdraw_stand_by a join member b on a.member_no = b.member_no where 1=1 and b.member_no = ? ";
  sql += " order by reg_date desc ";
  sql += " limit ?,?";
  var size = 5; // 한 페이지에 10개의 글을 보여준다.
  var begin = (page - 1) * size; // 시작 글
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(sqlCount, member_no, function (err, countRows) {
        if (err) {
          console.error("err", err);
          callback(contentsObj);
          conn.release();
        } else {
          conn.query(sql, [member_no, begin, size], function (err, rows) {
            if (err) {
              console.error("err", err);
              callback(contentsObj);
              conn.release();
            } else {
              var cnt = countRows[0].cnt; // 전체 글의 수
              var totalPage = Math.ceil(cnt / size); // 총 페이지 수
              var pageSize = 5; // 보여줄 페이지 수, 예) 11 12 13 14 15 16 17 18 19 20
              var currentBlock = Math.ceil(page / pageSize);
              var startPage = (currentBlock - 1) * pageSize + 1;
              var endPage = startPage + (pageSize - 1);
              if (endPage > totalPage) {
                // 예) 20 > 총 17페이지
                endPage = totalPage;
              }
              var max = cnt - (page - 1) * size;
              for (var i = 0; i < rows.length; i++) {
                rows[i].member_name = enDec.seedDecrytion(rows[i].member_name);
              }
              contentsObj.pageSize = pageSize;
              contentsObj.startPage = startPage;
              contentsObj.endPage = endPage;
              contentsObj.totalPage = totalPage;
              contentsObj.max = max;
              contentsObj.totalCount = cnt;
              contentsObj.isSuccess = true;
              contentsObj.contents = rows;
              callback(contentsObj);
              conn.release();
            }
          });
        }
      });
    });
  });
}

// 출금 대기내역 상태 변경 (승인/거절)
exports.withdrawApproval = withdrawApproval;
function withdrawApproval(datas, callback) {
  console.log(datas);
  var isSuccess = false;
  var updateSql = "update withdraw_stand_by set withdraw_complete = ? where withdraw_stand_by_no = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(updateSql, datas, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
};

// 출금 신청액 환불(거절)
exports.refundBenefit = refundBenefit;
function refundBenefit(datas, callback) {
  var isSuccess = false;
  var updateSql = "update member set benefit = benefit + ? where member_no = ?";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query(updateSql, datas, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            conn.release();
            isSuccess = true;
            callback(isSuccess);
          });
        }
      });
    });
  });
};

exports.getUserInfos = getUserInfos;
function getUserInfos(callback) {
  var isSuccess = false;
  var sql = "";
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query("select member_no,member_grade from member where member_grade <> 1", function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          row.forEach(function (item) {
            console.log(item);
            if (item.member_grade == 2) {
              sql += "insert into deposit_history (member_no,reg_date,deposit,type) values (" + item.member_no + ",'" + "2019-09-18 18:06:51" + "'," + 10000000 + ",0);";
            } else {
              sql += "insert into deposit_history (member_no,reg_date,deposit,type) values (" + item.member_no + ",'" + "2019-09-18 18:06:51" + "'," + 1000000 + ",0);";
            }
          })


          console.log(sql);
          conn.query(sql, function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            } else {
              conn.commit(function (err) {
                if (err) {
                  return conn.rollback(function () {
                    conn.release();
                    throw err;
                  });
                }
                conn.release();
                isSuccess = true;
                callback(isSuccess);
              });
            }
          });
        }
      });
    });
  });
}

exports.petCountCheck = petCountCheck;
function petCountCheck(callback) {
  var contentObj = { isSuccess: false, cnt: 0 }
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query('select count(*) cnt from pet', function (err, result) {
        if (err) {
          conn.release();
          throw err;
        }
        contentObj.isSuccess = true;
        contentObj.cnt = result[0].cnt;
        conn.release();
        callback(contentObj);
      });
    })
  })
}

//pet 수집 데이터 insert
exports.petDataCollect = petDataCollect
function petDataCollect(datas, callback) {
  var isSuccess = false;
  var member_no = datas[0];
  var petData = datas[1];
  var petDataInsert = "insert into pet (member_no,name,birthday,deathday,pet_kind,sex,neutered,breeds,animal_protection_number,img_front,img_nose,img_feature,img_right,img_left,memo) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  var sqlDatas = [
    member_no,
    petData.name,
    petData.birthday,
    petData.deathday,
    petData.pet_kind,
    petData.sex,
    petData.neutered,
    petData.breeds,
    petData.animal_protection_number,
    petData.img_front,
    petData.img_nose,
    petData.img_feature,
    petData.img_feature,
    petData.img_left,
    petData.memo,
  ]
  pool.getConnection(function (err, conn) {
    if (err) console.error("err", err);
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      //petData insert
      conn.query(petDataInsert, sqlDatas, function (err) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        }
        conn.commit(function (err) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          }
          console.log('추천인 select 끝');
          conn.release();
          isSuccess = true;
          callback(isSuccess);
        });
      })
    });
  });
}

exports.petCollectAirdrop = petCollectAirdrop
function petCollectAirdrop(member_no, callback) {
  console.log(member_no);
  var member_no = member_no;
  var whileSql = "select c.*,ifnull(b.after_PET,0) PET from (select max(a.pet_history_no) latest,a.member_no from PET_history a JOIN member b on a.member_no = b.member_no group by member_no) a JOIN PET_history b ON a.member_no = b.member_no and a.latest = b.pet_history_no RIGHT JOIN member c ON a.member_no = c.member_no where c.member_no = ?";
  var rewardPET = 10;
  var rewardPET_arr = [];
  var recommenderInfoArr = [];
  var type = 0;
  //현재 member_no의 정보 select Sql
  //보유 PET,추천인 여부
  pool.getConnection(function (err, conn) {
    if (err) {
      throw err;
    }
    conn.beginTransaction(function (err) {
      if (err) {
        throw err;
      }
      conn.query(whileSql, member_no, function (err, rows) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        } else {
          console.log("rows : " + rows[0].recommender_id);
          if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0) {
            console.log(true, rewardPET);
            recommender_no = rows[0].recommender_no;
            recommenderInfoArr.push(rows[0]);
            rewardPET_arr.push(rewardPET);
            conn.query(whileSql, recommender_no, function (err, rows) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              } else {
                console.log("rows1 : " + rows[0].recommender_id);
                rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                  recommender_no = rows[0].recommender_no;
                  recommenderInfoArr.push(rows[0]);
                  rewardPET_arr.push(rewardPET);
                  console.log(true, rewardPET);
                  conn.query(whileSql, recommender_no, function (err, rows) {
                    if (err) {
                      return conn.rollback(function () {
                        conn.release();
                        throw err;
                      });
                    } else {
                      console.log("rows2 : " + rows[0].recommender_id);
                      rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                      if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                        recommender_no = rows[0].recommender_no;
                        recommenderInfoArr.push(rows[0]);
                        rewardPET_arr.push(rewardPET);
                        console.log(true, rewardPET);
                        conn.query(whileSql, recommender_no, function (err, rows) {
                          if (err) {
                            return conn.rollback(function () {
                              conn.release();
                              throw err;
                            });
                          } else {
                            console.log("rows3 : " + rows[0].recommender_id);
                            rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                            if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                              recommender_no = rows[0].recommender_no;
                              recommenderInfoArr.push(rows[0]);
                              rewardPET_arr.push(rewardPET);
                              console.log(true, rewardPET);
                              conn.query(whileSql, recommender_no, function (err, rows) {
                                if (err) {
                                  return conn.rollback(function () {
                                    conn.release();
                                    throw err;
                                  });
                                } else {
                                  console.log("rows4 : " + rows[0].recommender_id);
                                  rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                  if (rows[0].recommender_no !== null && rows[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                    recommender_no = rows[0].recommender_no;
                                    recommenderInfoArr.push(rows[0]);
                                    rewardPET_arr.push(rewardPET);
                                    console.log(true, rewardPET);
                                    conn.query(whileSql, recommender_no, function (err, rows4) {
                                      if (err) {
                                        return conn.rollback(function () {
                                          conn.release();
                                          throw err;
                                        });
                                      } else {
                                        console.log("rows5 : " + rows4[0].recommender_id);
                                        rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                        if (rows4[0].recommender_no !== null && rows4[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                          recommender_no = rows4[0].recommender_no;
                                          recommenderInfoArr.push(rows4[0]);
                                          rewardPET_arr.push(rewardPET);
                                          console.log(true, rewardPET);
                                          conn.query(whileSql, recommender_no, function (err, rows4) {
                                            if (err) {
                                              return conn.rollback(function () {
                                                conn.release();
                                                throw err;
                                              });
                                            } else {
                                              console.log("rows6 : " + rows4[0].recommender_id);
                                              rewardPET = (rewardPET * 5 / 100).toFixed(3) * 1;
                                              if (rows4[0].recommender_no !== null && rows4[0].recommender_no !== 0 && rewardPET >= 0.001) {
                                                recommender_no = rows4[0].recommender_no;
                                                recommenderInfoArr.push(rows4[0]);
                                                rewardPET_arr.push(rewardPET);
                                                console.log(true, rewardPET);
                                                conn.commit(function (err) {
                                                  if (err) {
                                                    return conn.rollback(function () {
                                                      conn.release();
                                                      throw err;
                                                    });
                                                  }
                                                  console.log('추천인 select 끝');
                                                  conn.release();
                                                  doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                    if (cb) {
                                                      isSuccess = true;
                                                      callback(isSuccess);
                                                    } else {
                                                      callback(isSuccess);
                                                    }
                                                  });
                                                });
                                              } else {
                                                recommenderInfoArr.push(rows4[0]);
                                                rewardPET_arr.push(rewardPET);
                                                console.log(false, rewardPET);
                                                conn.commit(function (err) {
                                                  if (err) {
                                                    return conn.rollback(function () {
                                                      conn.release();
                                                      throw err;
                                                    });
                                                  }
                                                  console.log('추천인 select 끝');
                                                  conn.release();
                                                  doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                                    if (cb) {
                                                      isSuccess = true;
                                                      callback(isSuccess);
                                                    } else {
                                                      callback(isSuccess);
                                                    }
                                                  });
                                                });
                                              }
                                            }
                                          });
                                        } else {
                                          recommenderInfoArr.push(rows4[0]);
                                          rewardPET_arr.push(rewardPET);
                                          console.log(false, rewardPET);
                                          conn.commit(function (err) {
                                            if (err) {
                                              return conn.rollback(function () {
                                                conn.release();
                                                throw err;
                                              });
                                            }
                                            console.log('추천인 select 끝');
                                            conn.release();
                                            doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                              if (cb) {
                                                isSuccess = true;
                                                callback(isSuccess);
                                              } else {
                                                callback(isSuccess);
                                              }
                                            });
                                          });
                                        }
                                      }
                                    });
                                  } else {
                                    recommenderInfoArr.push(rows[0]);
                                    rewardPET_arr.push(rewardPET);
                                    console.log(false, rewardPET);
                                    conn.commit(function (err) {
                                      if (err) {
                                        return conn.rollback(function () {
                                          conn.release();
                                          throw err;
                                        });
                                      }
                                      console.log('추천인 select 끝');
                                      conn.release();
                                      doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                        if (cb) {
                                          isSuccess = true;
                                          callback(isSuccess);
                                        } else {
                                          callback(isSuccess);
                                        }
                                      });
                                    });
                                  }
                                }
                              });
                            } else {
                              recommenderInfoArr.push(rows[0]);
                              rewardPET_arr.push(rewardPET);
                              console.log(false, rewardPET);
                              conn.commit(function (err) {
                                if (err) {
                                  return conn.rollback(function () {
                                    conn.release();
                                    throw err;
                                  });
                                }
                                console.log('추천인 select 끝');
                                conn.release();
                                doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                                  if (cb) {
                                    isSuccess = true;
                                    callback(isSuccess);
                                  } else {
                                    callback(isSuccess);
                                  }
                                });
                              });
                            }
                          }
                        });
                      } else {
                        recommenderInfoArr.push(rows[0]);
                        rewardPET_arr.push(rewardPET);
                        console.log(false, rewardPET);
                        conn.commit(function (err) {
                          if (err) {
                            return conn.rollback(function () {
                              conn.release();
                              throw err;
                            });
                          }
                          console.log('추천인 select 끝');
                          conn.release();
                          doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                            if (cb) {
                              isSuccess = true;
                              callback(isSuccess);
                            } else {
                              callback(isSuccess);
                            }
                          });
                        });
                      }
                    }
                  });
                } else {
                  recommenderInfoArr.push(rows[0]);
                  rewardPET_arr.push(rewardPET);
                  console.log(false, rewardPET);
                  conn.commit(function (err) {
                    if (err) {
                      return conn.rollback(function () {
                        conn.release();
                        throw err;
                      });
                    }
                    console.log('추천인 select 끝');
                    conn.release();
                    doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                      if (cb) {
                        isSuccess = true;
                        callback(isSuccess);
                      } else {
                        callback(isSuccess);
                      }
                    });
                  });
                }
              }
            });
          } else {
            recommenderInfoArr.push(rows[0]);
            rewardPET_arr.push(rewardPET);
            console.log(false, rewardPET);
            conn.commit(function (err) {
              if (err) {
                return conn.rollback(function () {
                  conn.release();
                  throw err;
                });
              }
              console.log('추천인 select 끝');
              conn.release();
              doubleAirDropFun(recommenderInfoArr, rewardPET_arr, type, function (cb) {
                if (cb) {
                  isSuccess = true;
                  callback(isSuccess);
                } else {
                  callback(isSuccess);
                }
              });
            });
          }
        }
      });
    })
  });
}

exports.depositDate = depositDate;
function depositDate(callback) {
  var isSuccess = false;
  //var sql = "select deposit_history_no,member_no,reg_date from deposit_history where DATE(reg_date) = DATE_ADD(curdate(),INTERVAL -1 DAY)"
  var sql = "select deposit_history_no,member_no,reg_date from deposit_history where DATE(reg_date) = curdate()"
  var updateSql = "";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        }
        console.log(row);
        row.forEach(function (item) {
          updateSql += "update deposit_history set reg_date = DATE_ADD(\'" + item.reg_date + "\', INTERVAL -1 DAY) where deposit_history_no = " + item.deposit_history_no + ";"
        });
        console.log(updateSql);
        conn.query(updateSql, function (err) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          }
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            isSuccess = true;
            conn.release();
            callback(isSuccess);
          })
        })
      })
    })
  })
}

exports.PETDate = PETDate;
function PETDate(callback) {
  var isSuccess = false;
  var sql = "select pet_history_no,member_no,reg_date from PET_history where DATE(reg_date) = curdate()";
  var updateSql = "";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        }
        console.log(row);
        row.forEach(function (item) {
          updateSql += "update PET_history set reg_date = DATE_ADD(\'" + item.reg_date + "\', INTERVAL -1 DAY) where pet_history_no = " + item.pet_history_no + ";"
        });
        console.log(updateSql);
        conn.query(updateSql, function (err) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          }
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            isSuccess = true;
            conn.release();
            callback(isSuccess);
          })
        })
      })
    })
  })
}

exports.benefitReset = benefitReset;
function benefitReset(callback) {
  var isSuccess = false;
  var sql = "select member_no from member where member_no <> 0 group by member_no"
  var updateSql = "";
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) throw err;
      conn.query(sql, function (err, row) {
        if (err) {
          return conn.rollback(function () {
            conn.release();
            throw err;
          });
        }
        console.log(row);
        row.forEach(function (item) {
          updateSql += "update member set benefit = 0 where member_no = " + item.member_no + ";";
        });
        console.log(updateSql);
        conn.query(updateSql, function (err) {
          if (err) {
            return conn.rollback(function () {
              conn.release();
              throw err;
            });
          }
          conn.commit(function (err) {
            if (err) {
              return conn.rollback(function () {
                conn.release();
                throw err;
              });
            }
            isSuccess = true;
            conn.release();
            callback(isSuccess);
          })
        })
      })
    })
  })
}

exports.getPETPrice = getPETPrice;
function getPETPrice(callback) {
  var contentObj = { isSuccess: false, PET_price: 0 }
  pool.getConnection(function (err, conn) {
    if (err) throw err;
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        throw err;
      }
      conn.query('select PET_price from PET_setting', function (err, result) {
        if (err) {
          conn.release();
          throw err;
        }
        contentObj.isSuccess = true;
        contentObj.PET_price = result[0].PET_price;
        conn.release();
        callback(contentObj);
      });
    })
  })
}