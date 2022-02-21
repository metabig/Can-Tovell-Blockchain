import React, { useState, useEffect } from "react";
import { Card, Container, Spinner, Row, Col } from "react-bootstrap";
import { FcTimeline } from "react-icons/fc";

function Dashboard() {
  let [sensors, setSensor] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8100/api/sensors")
      .then((res) => res.json())
      .then((json) => setSensor(json));
  }, []);

  const getSensors = (devices) => {
    console.log(devices);
    let cards = [];
    for (let i = 0; i < devices.length; ++i) {
      const record = devices[i].Record;
      cards.push(
        <Card
          key={i}
          border="light"
          text={"black"}
          style={{
            margin: "40px",
            width: "16rem",
            backgroundColor: "white",
            border: "0px solid rgba(0, 0, 0, 0.125)",
            borderRadius: "1rem",
            boxShadow: "rgba(0, 0, 0, 0.05) 0rem 1.25rem 1.6875rem 0rem",
          }}
          className="mb-2"
        >
          <Card.Body>
            <Card.Title
              style={{
                color: "rgb(103, 116, 142)",
                fontWeight: "bold",
                fontSize: "20px",
              }}
            >
              {record.id}
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
      );
    }
    let row = <Row className="justify-content-md-center">{cards}</Row>
    return row;
  };

  return (
    <Container style={{ marginTop: "30px" }}>
      <h1 className="custom-header">
        Estat actual de la planta potabilitzadora <FcTimeline />
      </h1>
      {sensors ? getSensors(sensors) : <Spinner animation="border" />}
    </Container>
  );
}

export default Dashboard;
