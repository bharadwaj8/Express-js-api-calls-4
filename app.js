const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertStateToResponse = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictToResponse = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

//Get state list details
app.get("/states/", async (request, response) => {
  const stateQuery = `SELECT * FROM state order by 
  state_id;`;
  const dbResponse = await db.all(stateQuery);
  response.send(dbResponse.map((each) => convertStateToResponse(each)));
});

//GET state using state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state 
    WHERE state_id=${stateId};`;

  const dbResponse = await db.get(getStateQuery);
  response.send(convertStateToResponse(dbResponse));
});

//Add district
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const addDistrictQuery = `
    INSERT INTO district(
        district_name,
        state_id,
        cases,
        cured,
        active,
        deaths) VALUES(
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths});`;
  const dbResponse = await db.run(addDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});

//GET district based on ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  console.log(districtId);
  const getDistrictQuery = `
    SELECT * FROM district
    WHERE district_id=${districtId};`;

  const dbResponse = await db.run(getDistrictQuery);
  response.send(dbResponse);
  //response.send(convertDistrictToResponse(dbResponse));
});

//Delete district Id
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM district 
    WHERE district_id=${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update district Id
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE district 
    SET district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    WHERE district_id=${districtId};`;
  const dbResponse = await db.run(updateDistrictQuery);
  const district_id = dbResponse.lastID;
  response.send("District Details Updated");
});

//get total stats
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  console.log(stateId);
  const getStatsQuery = `
    SELECT SUM(cases) as totalCases,
    SUM(cured) as totalCured, 
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
    FROM district WHERE state_id=${stateId};`;

  const dbResponse = await db.all(getStatsQuery);
  response.send(dbResponse);
});

//get state name using districtId
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const query = `
    SELECT s.state_name FROM state s
    JOIN district d ON s.state_id=d.state_id
    WHERE district_id=${districtId};`;

  const dbResponse = await db.get(query);
  response.send({
    stateName: dbResponse.state_name,
  });
});

module.exports = express;
