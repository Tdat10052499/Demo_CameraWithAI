import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Container, Navbar, Row, Col, Card, Table, Badge, Spinner } from 'react-bootstrap';
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';

// 1. Cấu hình Supabase (Dùng lại thông tin cũ của bạn)
const SUPABASE_URL = "https://xmkstcpvqpmrsweyfate.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // Thay Key đầy đủ của bạn vào đây
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Hàm lấy dữ liệu từ Table
  const fetchDetections = async () => {
    const { data, error } = await supabase
      .from('detections')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) console.log('Lỗi lấy dữ liệu:', error);
    else setDetections(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetections();

    // 3. TÍNH NĂNG REALTIME: Tự động cập nhật khi ESP32 gửi ảnh mới
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'detections' }, (payload) => {
        setDetections((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const latest = detections[0];

  return (
    <div className="bg-light" style={{ minHeight: '100vh' }}>
      <Navbar bg="dark" variant="dark" className="mb-4 shadow-sm">
        <Container>
          <Navbar.Brand href="#">Smart Garden AIoT Dashboard</Navbar.Brand>
        </Container>
      </Navbar>

      <Container>
        {loading ? (
          <div className="text-center mt-5"><Spinner animation="border" variant="success" /></div>
        ) : (
          <Row>
            {/* CỘT TRÁI: ẢNH MỚI NHẤT */}
            <Col lg={5} className="mb-4">
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">📸 Hình ảnh Real-time</Card.Header>
                <Card.Body className="text-center">
                  {latest ? (
                    <>
                      <img 
                        src={latest.image_url} 
                        alt="Latest detection" 
                        className="img-fluid rounded mb-3 border"
                        style={{ maxHeight: '400px', objectFit: 'cover' }}
                      />
                      <h4>
                        <Badge bg={latest.label === 'Healthy' ? 'success' : latest.label === 'No Detection' ? 'secondary' : 'danger'}>
                          {latest.label}
                        </Badge>
                      </h4>
                      <small className="text-muted">Độ tin cậy: {latest.confidence * 100}%</small>
                    </>
                  ) : <p>Chưa có dữ liệu nào gửi lên.</p>}
                </Card.Body>
              </Card>
            </Col>

            {/* CỘT PHẢI: BẢNG LỊCH SỬ */}
            <Col lg={7}>
              <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">Nhật ký hệ thống</Card.Header>
                <Table hover responsive className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Thời gian</th>
                      <th>Kết quả</th>
                      <th>Độ tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detections.map((item) => (
                      <tr key={item.id}>
                        <td>{moment(item.created_at).fromNow()}</td>
                        <td>
                          <span className={`fw-bold ${item.label === 'Healthy' ? 'text-success' : 'text-danger'}`}>
                            {item.label}
                          </span>
                        </td>
                        <td>{item.confidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
}

export default App;