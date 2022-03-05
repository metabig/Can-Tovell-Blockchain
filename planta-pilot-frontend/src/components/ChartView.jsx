import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Spinner, Table } from "react-bootstrap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function ChartView() {
  let { id } = useParams();
  let [history, setHistory] = useState(null);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
      },
    },
  };

  useEffect(() => {
    fetch(`http://localhost:8100/api/history/${id}`)
      .then((res) => res.json())
      .then((json) => setHistory(json));
  }, [id]);

  const getRowsFromHistory = (data) => {
    let rows = [];
    for (let i = 0; i < data.length; ++i) {
      rows.push(
        <tr>
          <td>{data.length - i}</td>
          <td>
            <code style={{ color: "black" }}>{data[i].TxId}</code>
          </td>
          <td>
            {new Date(parseInt(data[i].Timestamp.seconds) * 1000).toISOString()}
          </td>
          <td>{data[i].Value.value}</td>
        </tr>
      );
    }
    return rows;
  };

  const getDatasetFromHistory = (hist) => {
    let dataset = {
      labels: [],
      datasets: [
        {
          label: !!history ? history[0].Value.name : "",
          data: [],
          borderColor: "rgb(52, 71, 103)",
          backgroundColor: "rgb(52, 71, 103)",
        },
      ],
    };
    for (let i = 0; i < hist.length; ++i) {
      dataset.labels.push(i + 1);
      dataset.datasets[0].data.push(hist[hist.length - i - 1].Value.value);
    }
    return dataset;
  };

  return (
    <Container>
      {!!history ? (
        <>
          <h1
            style={{
              color: "rgb(52, 71, 103)",
              fontWeight: "bold",
              fontSize: "36px",
              padding: "30px 0px 0px 40px",
            }}
          >
            {history[0].Value.name}
          </h1>
          <hr style={{ margin: "20px 0 0 20px", height: "3px" }} />
          <Line options={options} data={getDatasetFromHistory(history)} />
          <h1
            style={{
              color: "rgb(103, 116, 142)",
              fontWeight: "bold",
              fontSize: "20px",
              padding: "30px 0px 0px 40px",
            }}
          >
            Històric de Transaccions
          </h1>
          <Table
            style={{
              margin: "25px",
              background: "white",
              border: "0px solid rgba(0, 0, 0, 0.125)",
              borderRadius: ".5rem",
              boxShadow: "rgba(0, 0, 0, 0.02) 0rem 1.25rem 1.6875rem 0rem",
              textAlign: "center",
              width: "100%",
              borderSpacing: "20px",
            }}
            cellSpacing={10}
            bordered
            hover
          >
            <thead
              style={{
                color: "#4f5869",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              <tr>
                <th>#</th>
                <th>TxId</th>
                <th>Data</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {!!history ? (
                getRowsFromHistory(history)
              ) : (
                <Spinner animation="border" />
              )}
            </tbody>
          </Table>
        </>
      ) : (
        <Spinner animation="border" />
      )}

      {/* <code>{JSON.stringify(history)}</code> */}
    </Container>
  );
}

export default ChartView;
