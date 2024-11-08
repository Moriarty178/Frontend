// -------------------------------- Loin/Sign up ---------------------------------


// URL của backend API cho đăng nhập và đăng ký
const API_BASE_URL = 'http://localhost:8080/api/auth';//AuthController(BE)
let watchId = null; // Lưu trữ ID theo dõi vị trí

// Hàm đăng nhập
function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => response.json())
        .then(data => {
            const jwt = data.jwt;
            const driverId = data.id;

            if (jwt && driverId) {
                localStorage.setItem('jwt', jwt);
                localStorage.setItem('driverId', driverId);//lưu driverId
                // document.getElementById('login-message').textContent = 'Login successful!';
                afterLoginSuccess();

                initializeWebSocket(driverId); // Gọi hàm kết nối WebSocket sau khi đăng nhập thành công
            } else {
                document.getElementById('login-message').textContent = 'Login failed!';
            }
            // console.log(jwt);
        })
        .catch(error => {
            console.error('Error during login:', error);
            document.getElementById('login-message').textContent = 'Login failed!';
            document.getElementById('login-message').style.display = 'block';

        });
}

// window.onload giữ nguyên trạng thái trước khi reload sau khi tải lại trang.

// Hàm đăng ký
function signup() {
    const firstName = document.getElementById('signup-firstname').value;
    const lastName = document.getElementById('signup-lastname').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const phone = document.getElementById('signup-phone').value;

    fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, phone })
    })
        .then(response => response.text())
        .then(message => {
            document.getElementById('signup-message').textContent = message;
            if (message === 'Registered successfully!') {
                document.getElementById('signup-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error during signup:', error);
            document.getElementById('signup-message').textContent = 'Signup failed!';
        });
}

// Hàm đăng xuất
function logout() {
    const driverId = localStorage.getItem('driverId');
    console.log('driverId:', driverId);
    fetch(`http://localhost:8080/api/logout`, {
        method: 'POST',
        headers: {
            // 'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ driverId })
    })
        .then(response => {
            if (response.ok) {
                localStorage.removeItem('jwt');
                localStorage.removeItem('driverId');
                afterLogout();

                console.log('Logout successful');

                if (watchId != null) { // Tắt theo dõi vị trí khi tài xế đăng xuất
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                    console.log("Stopped watching geolocation after logout.");
                }
            }
        })
        .catch(error => console.error('Logout failed:', error));
}

// Đảm bảo rằng khi đăng xuất, các sự kiện được xóa bỏ
function afterLogout() {
// Reset lại trạng thái của các phần tử bên trong 'content'
    document.getElementById('tripList').style.display = 'none';
    document.getElementById('tripReceived').style.display = 'none';
    // document.getElementById('tripDetail').innerHTML = ''; // Xóa nội dung chi tiết chuyến đi nếu có

    // Xóa dữ liệu trong bảng nếu có
    document.querySelector('#tripListTable tbody').innerHTML = '';
    document.querySelector('#tripTable tbody').innerHTML = '';

    // Cập nhật giao diện
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('logout-form').classList.add('hidden');
    document.getElementById('location-display').classList.add('hidden');
    document.getElementById('login-message').classList.add('hidden');//

    
    document.getElementById('content').classList.add('hidden');// Ẩn toàn bộ nội dung sau khi đăng xuất
}

// Gán lại sự kiện khi đăng nhập thành công
function afterLoginSuccess() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('logout-form').classList.remove('hidden');
    document.getElementById('location-display').classList.remove('hidden');
    
    document.getElementById('content').classList.remove('hidden');// Hiển thị nội dung sau khi đăng nhập thành công
    document.getElementById('tripListBtn').addEventListener('click', fetchTripList);// Gán sự kiện cho nút Trip List
    document.getElementById('myTripBtn').addEventListener('click', fetchTripsReceived);// Gán sự kiện cho nút Trip Received
}
// Sự kiện trước khi thoát hoặc đóng tab
window.addEventListener('beforeunload', function (e) {
    // logout();
});

// Kiểm tra trạng thái đăng nhập khi tải trang
window.onload = function() {
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
        // Nếu đã đăng nhập
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('logout-form').classList.remove('hidden');
        document.getElementById('location-display').classList.remove('hidden');
        document.getElementById('content').classList.remove('hidden');
        initializeWebSocket(localStorage.getItem('driverId'));
    } else {
        // Nếu chưa đăng nhập
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('logout-form').classList.add('hidden');
        document.getElementById('location-display').classList.add('hidden');
        document.getElementById('content').classList.add('hidden');
    }
};

// Sự kiện cho nút chuyển đổi giữa Login và Signup
document.getElementById('show-signup').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});




//----------------------------- WebSocket sau khi đăng nhập thành công -------------------------------


const locationElement = document.getElementById('location');

// Hàm để khởi tạo WebSocket sau khi đăng nhập thành công
async function initializeWebSocket(driverId) {

    const statusElement = document.getElementById('status');
    const alertsElement = document.getElementById('alerts');

    // Kết nối đến WebSocket endpoint của backend
    const socket = new WebSocket('ws://localhost:8080/ws/driver');
    const stompClient = new StompJs.Client({//tạo 1 STOMP client trên kết nối WebSocket
        webSocketFactory: () => socket,
        debug: function (str) {
            console.log(str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });

    stompClient.onConnect = function (frame) {
        console.log('Connected: ' + frame);
        statusElement.textContent = 'Status: Connected';

        // Đăng ký nhận cảnh báo cho tài xế
        stompClient.subscribe('/topic/alert/' + driverId, function (message) {
            // const alertData = JSON.parse(messageOutput.body);
            // console.log('Received alert: ', alertData);
            // alertsElement.textContent = `Alert: ${alertData.message}, Speed: ${alertData.speed}`;

            // Hiển thị cảnh báo cho tài xế tab
            // showAlert(alertData);
            // Hiển thị thông tin driverRequest mà Backend gửi đến và cung câp tùy chọn chấp nhận hoặc từ chối
            // Thêm description: name vào đối tượng gủi sang "topic/alert/ + driverId" => khi parse sẽ check request.descripton = "requestTrip" hay là "cancelTrip" vv...
            const driverRequest = JSON.parse(message.body);
            console.log('loc_source driverRequest received from backend:', driverRequest.loc_source);
            console.log('loc_destination driverRequest received from backend:', driverRequest.loc_destination);
            handleDriverRequest(driverRequest); //driverRequest : {driverId:123, loc_source:{lat:..., lon:..., name:...}, loc_destination: {...}, distance: 15.7}
        });

        // Bắt đầu gửi thông tin vị trí khi WebSocket kết nối thành công
        startTracking(stompClient, driverId, "0");
    };

    // Hàm xử lý driverRequest được backend gửi đến, cung cấp tùy chọn chấp nhận hoặc từ chối
    function handleDriverRequest(driverRequest) {
        // Hiển thị thông tin loc_source, loc_destination và distance cho tài xế
        // const requestInfo = `Yêu cầu từ khách hàng:
        // Điểm đón: ${driverRequest.loc_source.lat}, ${driverRequest.loc_source.lon}
        // Điểm trả: ${driverRequest.loc_destination.lat}, ${driverRequest.loc_destination.lon}
        // Khoảng cách: ${driverRequest.distance} km`;
        const requestInfo = `Yêu cầu từ khách hàng:
        Điểm đón: ${driverRequest.loc_source.display_name}
        Điểm trả: ${driverRequest.loc_destination.display_name}
        Khoảng cách: ${driverRequest.distance} km`;

        document.getElementById('request-driver').style.display = 'block';

        document.getElementById('request-info').textContent = requestInfo; // Hiển thị thông tin yêu cầu trên giao diện

        // Hiển thị các nút "accept" và "deny" trên giao diện để tài xế lựa chọn
        document.getElementById('accept-button').style.display = 'inline';
        document.getElementById('deny-button').style.display = 'inline';

        // Xử lý khi tài xế ấn nút "accept"
        document.getElementById('accept-button').addEventListener('click', function () {
            sendDriverResponse("accepted"); // Nếu chấp nhận, gửi với status "accepted"
            hideRequestButtons(); // Ẩn nút sau khi đã xử lý
            // alert("Bạn đã chấp nhận yêu cầu."); // Thông báo tài xế
            lastTripStatuses = ["2"]; // gán một giá trị status cho lastTripStatuses khi ấn accept hoặc Get It để ko cần phải gọi hàm getTripStatuses().


            // Khi tài xế ấn accept thì bắt đầu auto publish vị trí đến backend "/app/driver-location-with-trip"". Ngừng gửi khi tất cả chuyến đi đã nhận đều có status "4"
            // startTracking(stompClient, driverId, "2"); // status "2" đại diện cho chuyến đi vừa được nhận (ấn nút "Accept" hoặc nút "Get It").
        });

        // Xử lý khi tài xế ấn nút "deny"
        document.getElementById('deny-button').addEventListener('click', function () {
            sendDriverResponse("declined"); // Nếu từ chối, gửi với status "declined"
            hideRequestButtons(); // Ẩn nút sau khi đã xử lý
            // alert("Bạn đã từ chối yêu cầu.");
        });
    }

    // Hàm để ẩn nút và xóa request-info sau khi tài xế đã quyết định
    function hideRequestButtons() {
        document.getElementById('accept-button').style.display = 'none';
        document.getElementById('deny-button').style.display = 'none';
        document.getElementById('request-info').innerHTML = '';
    }

    // Hàm gửi phản hồi của tài xế qua WebSocket đến Backend
    function sendDriverResponse(status) {
        const driverResponse = {
            driverId: driverId,
            status: status
        };
        // Gửi phản hồi của tài xế đến backend
        stompClient.publish({
            destination: '/app/driver-response',
            body: JSON.stringify(driverResponse),
        });
    }

    // Khi kết nối WebSocket bị đóng
    stompClient.onWebSocketClose = function (event) {
        console.log('WebSocket connection closed.', event);
        statusElement.textContent = 'Status: Disconnected';
        // Thử kết nối lại hoặc thông báo lỗi cho người dùng
        // reconnect();
    };

    //Xử lý khi có lỗi liên quan đến STOPM vd: subcribe, unsubcribe hoặc lỗi tử server khi gửi phản hồi không đúng định dạng STOMP.
    stompClient.onStompError = function (error) {
        console.error('WebSocket error: ', error);
    };

    // //Xử lý khi WebSocket bị lỗi vd: kết nối lại
    // stompClient.onWebSocketError = function(event) {
    //     console.log('WebSocket error: ', event);
    //     // Thử kết nối lại hoặc thông báo lỗi cho người dùng
    //     // reconnect();
    // }

    //Kích hoạt kết nối khi đã thiết lập xong
    stompClient.activate();
    lastTripStatuses = await getTripStatuses(driverId); // thêm phần trả về khi không có chuyến đi nào fetch rỗng
}


// // Hàm để cập nhật cảnh báo
// function showAlert(alertData) {
//     // Hiển thị cảnh báo cho tài xế (có thể thay alert bằng UI notification khác)
//     alert(`Alert: ${alertData.message}. Speed: ${alertData.speed}`);
// }

let lastTripStatuses = [];
// Hàm lấy status của tất cả chuyến đi(trip) của tài xế
async function getTripStatuses(driverId) {
    try {
        const response = await fetch(`http://localhost:8080/trips/${driverId}/trips-status`); // Chờ phản hồi từ server
        const statuses = await response.json();  
        console.log('status from backend:', statuses);
        return statuses; // Trả về danh sách trạng thái 
    } catch(error) {
        console.error('Error fetching trip statuses: ', error);
        return [];
    }
}

// Hàm để bắt đầu theo dõi và gửi thông tin vị trí
async function startTracking(stompClient, driverId, status) {

    // trường hợp khi tài xế đăng nhập vào thì thực hiện tự động gửi vị trí đến backend để gửi lên Admin Web theo dõi tất cả tài xế.
    if (navigator.geolocation) {

        watchId = navigator.geolocation.watchPosition(function (position) {
            const locationData = {
                driverId: driverId, // Thêm ID tài xế vào dữ liệu vị trí
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                timestamp: position.timestamp
            };

            // document.getElementById('location').textContent
            locationElement.textContent = `Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}, Speed: ${position.coords.speed}, TimeStamp: ${position.timestamp}, DriverID: ${driverId}`;
            // Gửi dữ liệu vị trí qua WebSocket topic đến backend ('MessageMappint('driver-location'))
            stompClient.publish({
                destination: '/app/driver-location',
                body: JSON.stringify(locationData),
            });

            console.log('lastTripStatuses = ', lastTripStatuses);

            // Kiêm tra trạng thái của các chuyến đi
            if (lastTripStatuses.every(status => status === '4')){ // nếu tất cả chuyến đi status "4"
                console.log('All trips are completed. Stop sending location.');
                return;
            } 

            // Nếu có chuyến đi chưa hoàn thành -> tiếp tục gửi vị trí
            const locationData2 = { // dùng lại để hạn chế viết class DTO mới, ko dùng tripId vì customer nhận qua topic "/topic/location-send-to-customer-web" + driverId
                driverId: driverId, 
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                speed: position.coords.speed,
                timestamp: position.timestamp
            };

            // Gửi dữ liệu vị trí qua WebSocket topic đến backend ('MessageMappint('driver-location-with-trip'))
            stompClient.publish({
                destination: '/app/driver-location-with-trip',
                body: JSON.stringify(locationData2),
            });
        }, function (error) {
            console.error('Geolocation error: ', error);
        }, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
        locationElement.textContent = "Geolocation iss not supported by this browser.";
    }
}




// (Optional) Hàm để kết nối lại khi có lỗi hoặc mất kết nối
// function reconnect() {
//     // Logic để kết nối lại WebSocket và STOMP client
// }




// ---------------------- Gửi yêu cầu service từ front-end ---------------------------
// const jwt1 = localStorage.getItem('jwt');

// fetch(`${API_BASE_URL}/endpoint`, {
//     method: 'GET',
//     headers: {
//         'Authorization': `Bearer ${jwt1}`
//     }
// })
// .then(response => response.json())
// .then(data => {
//     console.log('Data:', data);
// })
// .catch(error => {
//     console.log('Error:', error);
// })



