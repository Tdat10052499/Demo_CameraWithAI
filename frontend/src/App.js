import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Container, Navbar, Row, Col, Card, Badge, Spinner, Button, Modal } from 'react-bootstrap';
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';

// ================= CẤU HÌNH SUPABASE =================
const SUPABASE_URL = "https://xmkstcpvqpmrsweyfate.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3N0Y3B2cXBtcnN3ZXlmYXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzQxMDcsImV4cCI6MjA4OTI1MDEwN30.u8oDHo1MPWfZSOjMv68h3HmM47wSGC-GNWP4cuI3Gvw"; // Nhớ điền Key thật của bạn vào
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, HEALTHY, DISEASE
  
  // State cho tính năng Phóng to ảnh (Modal)
  const [showModal, setShowModal] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(() => {
    fetchDetections();

    // Realtime Listener
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'detections' }, (payload) => {
        setDetections((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchDetections = async () => {
    const { data, error } = await supabase
      .from('detections')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setDetections(data);
    setLoading(false);
  };

  // Logic lọc hình ảnh
  const filteredDetections = detections.filter(item => {
    if (filter === 'HEALTHY') return item.label === 'Healthy';
    if (filter === 'DISEASE') return item.label !== 'Healthy' && item.label !== 'No Detection';
    return true;
  });

  // Hàm mở Modal phóng to ảnh
  const handleShow = (item) => {
    setSelectedImg(item);
    setShowModal(true);
  };

  return (
    <div className="bg-light" style={{ minHeight: '100vh', paddingBottom: '50px' }}>
      {/* NAVBAR TRONG SUỐT VÀ SANG TRỌNG */}
      <Navbar bg="white" className="mb-4 shadow-sm py-3">
        <Container>
          <Navbar.Brand className="fw-bold text-success">
            🌱 Smart Garden <span className="text-dark">Image Manager</span>
          </Navbar.Brand>
          <Navbar.Text className="text-muted">
            Tổng số: <span className="fw-bold">{detections.length}</span> hình ảnh
          </Navbar.Text>
        </Container>
      </Navbar>

      <Container>
        {/* BỘ LỌC HÌNH ẢNH */}
        <div className="d-flex justify-content-center mb-4 gap-2">
          <Button variant={filter === 'ALL' ? 'dark' : 'outline-dark'} onClick={() => setFilter('ALL')} className="rounded-pill px-4">
            Tất cả
          </Button>
          <Button variant={filter === 'HEALTHY' ? 'success' : 'outline-success'} onClick={() => setFilter('HEALTHY')} className="rounded-pill px-4">
            Khỏe mạnh
          </Button>
          <Button variant={filter === 'DISEASE' ? 'danger' : 'outline-danger'} onClick={() => setFilter('DISEASE')} className="rounded-pill px-4">
            Phát hiện bệnh
          </Button>
        </div>

        {/* LƯỚI HÌNH ẢNH (GALLERY) */}
        {loading ? (
          <div className="text-center mt-5"><Spinner animation="border" variant="success" /></div>
        ) : (
          <Row className="g-4">
            {filteredDetections.map((item) => (
              <Col md={4} lg={3} key={item.id}>
                <Card className="h-100 shadow-sm border-0" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleShow(item)}>
                  {/* Ảnh thu nhỏ */}
                  <Card.Img variant="top" src={item.image_url} style={{ height: '200px', objectFit: 'cover' }} />
                  <Card.Body className="text-center p-3">
                    <Card.Title className="mb-2">
                      <Badge bg={item.label === 'Healthy' ? 'success' : item.label === 'No Detection' ? 'secondary' : 'danger'} className="px-3 py-2 rounded-pill">
                        {item.label}
                      </Badge>
                    </Card.Title>
                    <Card.Text className="text-muted small mb-0">
                      {moment(item.created_at).format('DD/MM/YYYY HH:mm')}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            
            {filteredDetections.length === 0 && (
              <div className="text-center text-muted mt-5">Không tìm thấy hình ảnh nào phù hợp.</div>
            )}
          </Row>
        )}
      </Container>

      {/* MODAL PHÓNG TO CHI TIẾT ẢNH */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Chi tiết phân tích</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedImg && (
            <>
              <img src={selectedImg.image_url} alt="Detail" className="img-fluid rounded shadow-sm mb-3" />
              <div className="d-flex justify-content-around mt-3 p-3 bg-light rounded">
                <div>
                  <small className="text-muted d-block">Kết luận AI</small>
                  <strong className={selectedImg.label === 'Healthy' ? 'text-success' : 'text-danger'}>{selectedImg.label}</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Độ tin cậy</small>
                  <strong>{(selectedImg.confidence * 100).toFixed(1)}%</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Thời gian chụp</small>
                  <strong>{moment(selectedImg.created_at).format('HH:mm - DD/MM/YYYY')}</strong>
                </div>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default App;