import React from "react";
import { Navbar, Container } from "react-bootstrap";

function CustomNavBar() {

  return (
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand style={{fontWeight: '900', color: '#d6d6d6'}}>Aigües de Catalunya</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text>
              Grup: Ca'n Tovell
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
      </Navbar>
  );
}

export default CustomNavBar;