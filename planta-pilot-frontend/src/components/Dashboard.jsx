import React, { useState, useEffect } from "react";
import { Card, Container, Spinner, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FcTimeline } from "react-icons/fc";

function Dashboard() {
  let [sensors, setSensor] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8100/api/sensors")
      .then((res) => res.json())
      .then((json) => setSensor(json));
  }, []);

  const getSensors = (devices) => {
    let rows = [];
    let devicesByDeposit = {
      "Dipòsit de capçalera": [],
      "Primera osmosi inversa": [],
      "Segona osmosi inversa": [],
      "Oxidació avançada (UV-AOP)": [],
      "Dipòsit de sortida (remineralització)": [],
    };
    for (let i = 0; i < devices.length; ++i)
      if (Array.isArray(devicesByDeposit[devices[i].Record.deposit]))
        devicesByDeposit[devices[i].Record.deposit].push(devices[i]);
      else devicesByDeposit[devices[i].Record.deposit] = [devices[i]];
    console.log(devicesByDeposit);

    let sections = [];
    for (const [key, value] of Object.entries(devicesByDeposit)) {
      sections.push(
        <>
          <h2
            key={key}
            style={{ marginTop: "50px" }}
            className="secondary-custom-header"
          >
            {key}
          </h2>
          <hr style={{ margin: "20px 0 0 20px", height: "3px" }} />
        </>
      );
      let cards = [];
      for (let i = 0; i < value.length; ++i) {
        const record = value[i].Record;
        cards.push(
          <>
            {sections.length !== 0 && sections.pop()}
            <Col>
              <Link to={record.id} style={{ textDecoration: "none" }}>
                <Card
                  key={i}
                  border="light"
                  text={"black"}
                  style={{
                    marginTop: "30px",
                    width: "17rem",
                    backgroundColor: "white",
                    border: "0px solid rgba(0, 0, 0, 0.125)",
                    borderRadius: "1rem",
                    boxShadow:
                      "rgba(0, 0, 0, 0.02) 0rem 1.25rem 1.6875rem 0rem",
                    cursor: "pointer",
                  }}
                  className="mb-2 hovered"
                >
                  <Card.Body>
                    <Card.Title
                      style={{
                        color: "rgb(103, 116, 142)",
                        fontWeight: "bold",
                        fontSize: "20px",
                      }}
                    >
                      {record.name}
                    </Card.Title>
                    <Card.Text
                      style={{
                        color: "#344767",
                        fontWeight: "bold",
                        fontSize: "25px",
                        textAlign: "center",
                      }}
                    >
                      {record.value}{" "}
                      <p
                        style={{
                          display: "inline",
                          fontWeight: "400",
                          fontSize: "15px",
                        }}
                      >
                        {record.unit}
                      </p>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </>
        );
      }
      rows.push(<Row className="justify-content-md-center">{cards}</Row>);
    }
    return rows;
  };

  return (
    <Container style={{ marginTop: "30px" }}>
      <h1 className="custom-header">
        Estat actual de la planta purificadora <FcTimeline />
      </h1>
      {sensors ? getSensors(sensors) : <Spinner animation="border" />}
    </Container>
  );
}

export default Dashboard;
