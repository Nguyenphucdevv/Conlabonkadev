// Admin Map JavaScript - Tối ưu và gọn gàng
console.log("🚀 Admin Map JavaScript đã được load!");

// Admin Map Configuration
const adminMapConfig = {
    center: [21.07088380428482, 105.77995583357745], // Hà Nội
    zoom: 13,
    maxZoom: 19,
    tileLayer: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap Contributors"
};

// Global variables
let adminMap;
let adminMarkers = [];
let adminCurrentLocationMarker = null;
let adminLibrariesData = [];
let currentEditingLibrary = null;

// DOM Ready
document.addEventListener("DOMContentLoaded", function() {
    console.log("📱 DOM đã sẵn sàng, khởi tạo Admin Map...");
    
    try {
        initializeAdminMap();
        setupAdminEventListeners();
        loadAdminLibraries();
        startModalCleanup(); // Khởi động modal cleanup
    } catch (error) {
        console.error("❌ Lỗi trong DOM Ready:", error);
    }
});

// Modal Cleanup Functions
function cleanupStuckModals() {
    try {
        console.log(" Đang dọn dẹp modal backdrop bị kẹt...");
        // Nếu đang có modal hợp lệ đang mở thì KHÔNG dọn dẹp
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            console.log("⚠️ Bỏ qua cleanup vì đang có modal mở:", openModal.id);
            return;
        }
        
        // Xóa tất cả modal backdrop bị kẹt
        const stuckBackdrops = document.querySelectorAll('.modal-backdrop');
        stuckBackdrops.forEach(backdrop => {
            try {
                backdrop.remove();
                console.log("✅ Đã xóa modal backdrop bị kẹt");
            } catch (e) {
                console.warn("⚠️ Không thể xóa backdrop:", e);
            }
        });
        
        // Xóa class modal-open khỏi body
        if (document.body.classList.contains('modal-open')) {
            document.body.classList.remove('modal-open');
            console.log("✅ Đã xóa class modal-open");
        }
        
        // Xóa padding-right khỏi body
        if (document.body.style.paddingRight) {
            document.body.style.paddingRight = '';
            console.log("✅ Đã xóa padding-right");
        }
        
        // Không đóng modal nào ở đây vì chỉ xử lý khi không có modal mở
        
        // Xóa tất cả modal fade show
        const fadeModals = document.querySelectorAll('.modal.fade.show');
        fadeModals.forEach(modal => {
            modal.classList.remove('fade', 'show');
            modal.style.display = 'none';
            console.log("✅ Đã xóa modal fade show");
        });
        
        console.log("✅ Hoàn thành dọn dẹp modal backdrop");
        
    } catch (error) {
        console.error("❌ Lỗi khi dọn dẹp modal:", error);
    }
}

function forceCleanupAllModals() {
    try {
        console.log("🧹 Force cleanup tất cả modal...");
        
        // Xóa tất cả modal backdrop
        const allBackdrops = document.querySelectorAll('.modal-backdrop');
        allBackdrops.forEach(backdrop => backdrop.remove());
        
        // Reset body
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        
        // Ẩn tất cả modal
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            modal.classList.remove('show', 'fade');
            modal.style.display = 'none';
        });
        
        // Xóa tất cả Bootstrap modal instances
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const modalElements = document.querySelectorAll('[data-bs-toggle="modal"]');
            modalElements.forEach(element => {
                try {
                    const modalInstance = bootstrap.Modal.getInstance(element);
                    if (modalInstance) {
                        modalInstance.dispose();
                    }
                } catch (e) {
                    // Ignore errors
                }
            });
        }
        
        console.log("✅ Force cleanup hoàn thành");
        showAdminSuccess("Đã dọn dẹp tất cả modal!");
        
    } catch (error) {
        console.error("❌ Lỗi khi force cleanup:", error);
    }
}

function startModalCleanup() {
    try {
        console.log(" Bắt đầu auto-cleanup modal...");
        
        // Kiểm tra và dọn dẹp mỗi 3 giây
        setInterval(() => {
            try {
                // Kiểm tra có modal backdrop nào chặn màn hình không
                const blockingBackdrops = document.querySelectorAll('.modal-backdrop');
                const hasBlockingBackdrop = blockingBackdrops.length > 0;
                const openModal = document.querySelector('.modal.show');
                
                // Chỉ cleanup khi CÓ backdrop nhưng KHÔNG có modal nào đang mở
                if (hasBlockingBackdrop && !openModal) {
                    console.log("🔄 Phát hiện modal backdrop chặn màn hình, đang dọn dẹp...");
                    cleanupStuckModals();
                }
                
                // Kiểm tra body có bị khóa không
                if (document.body.classList.contains('modal-open') && !openModal) {
                    console.log("🔄 Phát hiện body bị khóa, đang khôi phục...");
                    document.body.classList.remove('modal-open');
                    document.body.style.paddingRight = '';
                    document.body.style.overflow = '';
                }
                
            } catch (error) {
                console.warn("⚠️ Lỗi trong auto-cleanup:", error);
            }
        }, 3000);
        
        console.log("✅ Auto-cleanup modal đã được khởi động");
        
    } catch (error) {
        console.error("❌ Lỗi khi khởi động auto-cleanup:", error);
    }
}

// Initialize Admin Map
function initializeAdminMap() {
    try {
        console.log("🗺️ Đang khởi tạo Admin Map...");
        
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            throw new Error("Leaflet library chưa được load!");
        }
        console.log("✅ Leaflet library đã được load:", L.version);
        
        // Check map container
        const mapContainer = document.getElementById("admin-map");
        if (!mapContainer) {
            throw new Error("Không tìm thấy element #admin-map!");
        }
        console.log("✅ Map container đã được tìm thấy:", mapContainer);
        
        // Hide loading
        const loadingElement = document.querySelector(".admin-map-loading");
        if (loadingElement) {
            loadingElement.style.display = "none";
            console.log("✅ Loading element đã được ẩn");
        }

        // Create map
        console.log("🗺️ Tạo map với config:", adminMapConfig);
        adminMap = L.map("admin-map").setView(adminMapConfig.center, adminMapConfig.zoom);

        // Add tile layer
        L.tileLayer(adminMapConfig.tileLayer, {
            maxZoom: adminMapConfig.maxZoom,
            attribution: adminMapConfig.attribution
        }).addTo(adminMap);

        // Add scale control
        L.control.scale().addTo(adminMap);

        // Add zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(adminMap);

        console.log("✅ Admin Map đã được khởi tạo thành công");
        
        // Trigger map ready event
        adminMap.on('load', function() {
            console.log("🗺️ Map tiles đã được load");
        });

    } catch (error) {
        console.error("❌ Lỗi khi khởi tạo Admin Map:", error);
        showAdminError("Không thể khởi tạo bản đồ: " + error.message);
    }
}

// Setup Admin Event Listeners
function setupAdminEventListeners() {
    console.log("🔧 Đang thiết lập Admin Event Listeners...");
    
    // Search button
    const searchBtn = document.getElementById("admin-search-button");
    if (searchBtn) {
        searchBtn.addEventListener("click", performAdminSearch);
    }

    // Filter button
    const filterBtn = document.getElementById("admin-filter-button");
    if (filterBtn) {
        filterBtn.addEventListener("click", () => {
            cleanupStuckModals(); // Dọn dẹp trước khi mở modal mới
            const modal = new bootstrap.Modal(document.getElementById("adminFilterModal"));
            modal.show();
        });
    }

    // List button
    const listBtn = document.getElementById("admin-list-button");
    if (listBtn) {
        listBtn.addEventListener("click", () => {
            cleanupStuckModals(); // Dọn dẹp trước khi mở modal mới
            const modal = new bootstrap.Modal(document.getElementById("adminLibrariesModal"));
            modal.show();
            loadAdminLibrariesList();
        });
    }

    // Nearest button
    const nearestBtn = document.getElementById("admin-nearest-button");
    if (nearestBtn) {
        nearestBtn.addEventListener("click", findNearestLibraries);
    }

    // Restore button
    const restoreBtn = document.getElementById("admin-restore-button");
    if (restoreBtn) {
        restoreBtn.addEventListener("click", restoreMapView);
    }

    // Locate button
    const locateBtn = document.getElementById("admin-locate-button");
    if (locateBtn) {
        locateBtn.addEventListener("click", getAdminLocation);
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById("admin-fullscreen-button");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", toggleAdminFullscreen);
    }

    // Export button
    const exportBtn = document.getElementById("admin-export-button");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportAdminData);
    }

    // Check map button
    const checkMapBtn = document.getElementById("admin-check-map-button");
    if (checkMapBtn) {
        checkMapBtn.addEventListener("click", () => {
            showAdminSuccess("✅ Map hoạt động bình thường!");
        });
    }

    // Save library changes button
    const saveChangesBtn = document.getElementById("saveLibraryChanges");
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener("click", saveLibraryChanges);
        console.log("✅ Save changes button listener đã được thiết lập");
    }

    // Filter modal events
    const applyFilterBtn = document.getElementById("admin-apply-filter");
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener("click", applyAdminFilters);
    }

    const resetFilterBtn = document.getElementById("admin-reset-filter");
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener("click", resetAdminFilters);
    }

    // Libraries modal events
    const librarySearchInput = document.getElementById("admin-library-search");
    if (librarySearchInput) {
        librarySearchInput.addEventListener("input", filterAdminLibraries);
    }

    const libraryTypeFilter = document.getElementById("admin-library-type-filter");
    if (libraryTypeFilter) {
        libraryTypeFilter.addEventListener("change", filterAdminLibraries);
    }

    const refreshLibrariesBtn = document.getElementById("admin-refresh-libraries");
    if (refreshLibrariesBtn) {
        refreshLibrariesBtn.addEventListener("click", loadAdminLibrariesList);
    }

    // Search input enter key
    const mainSearchInput = document.getElementById("admin-main-search");
    if (mainSearchInput) {
        mainSearchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                performAdminSearch();
            }
        });
    }

    // Thêm nút cleanup modal vào floating controls
    addCleanupButton();

    console.log("✅ Admin Event Listeners đã được thiết lập");
}

// Thêm nút cleanup modal
function addCleanupButton() {
    const controlGroup = document.querySelector('.control-group');
    if (controlGroup) {
        const cleanupBtn = document.createElement('button');
        cleanupBtn.className = 'btn btn-danger btn-sm';
        cleanupBtn.title = 'Dọn Dẹp Modal';
        cleanupBtn.innerHTML = '<i class="bi bi-trash"></i>';
        cleanupBtn.onclick = () => {
            forceCleanupAllModals();
        };
        controlGroup.appendChild(cleanupBtn);
        console.log("✅ Đã thêm nút cleanup modal");
    }
}

// Load Admin Libraries
async function loadAdminLibraries() {
    try {
        console.log("📚 Đang tải dữ liệu thư viện...");
        
        const response = await fetch("/data");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.features) {
            adminLibrariesData = data.features;
            renderAdminLibraries(data.features);
            updateStatistics();
            console.log(`✅ Đã tải ${data.features.length} thư viện cho Admin Map`);
        } else {
            throw new Error("Dữ liệu không hợp lệ");
        }
        
    } catch (error) {
        console.error("❌ Lỗi khi tải dữ liệu thư viện:", error);
        showAdminError("Không thể tải dữ liệu thư viện: " + error.message);
    }
}

// Render Admin Libraries
function renderAdminLibraries(libraries) {
    if (!adminMap) {
        console.error("❌ Admin Map chưa được khởi tạo");
        return;
    }

    // Clear existing markers
    adminMarkers.forEach(marker => adminMap.removeLayer(marker));
    adminMarkers = [];

    // Create admin icon
    const adminIcon = L.icon({
        iconUrl: "/images/igel.png",
        iconSize: [60, 60],
        iconAnchor: [30, 60],
        popupAnchor: [0, -50]
    });

    // Add markers for each library
    libraries.forEach((library, index) => {
        const coords = library.geometry.coordinates;
        const properties = library.properties;

        if (coords && coords.length === 2) {
            const marker = L.marker([coords[1], coords[0]], {
                icon: adminIcon
            }).addTo(adminMap);
            
            adminMarkers.push(marker);

            // Create enhanced popup for admin
            const popupContent = createAdminPopupContent(properties, coords);
            marker.bindPopup(popupContent);

            // Add click event
            marker.on("click", () => {
                console.log(`🖱️ Admin click vào thư viện: ${properties.TenThuVien}`);
                highlightAdminLibrary(marker);
            });

            // Add hover effects
            marker.on("mouseover", function() {
                this.setZIndexOffset(1000);
            });
            
            marker.on("mouseout", function() {
                this.setZIndexOffset(0);
            });
        }
    });

    // Fit bounds if markers exist
    if (adminMarkers.length > 0) {
        const bounds = L.latLngBounds(adminMarkers.map(marker => marker.getLatLng()));
        adminMap.fitBounds(bounds, { padding: [20, 20] });
    }

    console.log(`✅ Đã render ${adminMarkers.length} markers trên Admin Map`);
}

// Create Admin Popup Content
function createAdminPopupContent(properties, coords) {
    const utilities = [];
    if (properties.Wifi) utilities.push('<span class="utility-item active"><i class="bi bi-wifi"></i> Wifi</span>');
    if (properties.PhongDoc) utilities.push('<span class="utility-item active"><i class="bi bi-book"></i> Phòng đọc</span>');
    if (properties.Canteen) utilities.push('<span class="utility-item active"><i class="bi bi-cup-hot"></i> Canteen</span>');
    if (properties.DieuHoa) utilities.push('<span class="utility-item active"><i class="bi bi-snow"></i> Điều hòa</span>');

    // Add inactive utilities
    if (!properties.Wifi) utilities.push('<span class="utility-item"><i class="bi bi-wifi"></i> Wifi</span>');
    if (!properties.PhongDoc) utilities.push('<span class="utility-item"><i class="bi bi-book"></i> Phòng đọc</span>');
    if (!properties.Canteen) utilities.push('<span class="utility-item"><i class="bi bi-cup-hot"></i> Canteen</span>');
    if (!properties.DieuHoa) utilities.push('<span class="utility-item"><i class="bi bi-snow"></i> Điều hòa</span>');

    return `
        <div class="admin-popup-content">
            <div class="popup-header">
                <h6><i class="bi bi-building me-2"></i>${properties.TenThuVien}</h6>
                <span class="popup-id">ID: ${properties.ID}</span>
            </div>
            
            ${properties.Anh360 ? `
                <div class="popup-image">
                    <img src="${properties.Anh360}" alt="${properties.TenThuVien}" class="img-fluid">
                </div>
            ` : ''}
            
            <div class="popup-info">
                <p><i class="bi bi-geo-alt text-success me-2"></i>${properties.DiaChi}</p>
                <p><i class="bi bi-tag text-primary me-2"></i>${properties.phanloai || "Không xác định"}</p>
                ${properties.Sachs && properties.Sachs.length > 0 ? `
                    <p><i class="bi bi-book text-info me-2"></i>${properties.Sachs.length} sách</p>
                ` : ''}
            </div>
            
            <div class="popup-utilities">
                ${utilities.join('')}
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="showAdminDirections(${coords[1]}, ${coords[0]}, '${properties.TenThuVien}')">
                    <i class="bi bi-arrow-right-circle"></i> Chỉ đường
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="editLibraryOnMap(${properties.ID})">
                    <i class="bi bi-pencil"></i> Chỉnh sửa
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="viewAdminLibraryDetails(${properties.ID})">
                    <i class="bi bi-info-circle"></i> Chi tiết
                </button>
            </div>
        </div>
    `;
}

// Edit Library Functions
function editLibraryOnMap(libraryId) {
    try {
        console.log(`✏️ Đang chỉnh sửa thư viện ID: ${libraryId}`);
        
        const library = adminLibrariesData.find(lib => lib.properties.ID == libraryId);
        if (!library) {
            showAdminError("Không tìm thấy thư viện!");
            return;
        }
        
        currentEditingLibrary = library;
        const properties = library.properties;
        const coords = library.geometry.coordinates;
        
        // Fill form with current data
        document.getElementById('edit-library-name').value = properties.TenThuVien || '';
        document.getElementById('edit-library-type').value = properties.phanloai || 'Thư viện công cộng';
        document.getElementById('edit-library-address').value = properties.DiaChi || '';
        document.getElementById('edit-library-lat').value = coords[1] || '';
        document.getElementById('edit-library-lng').value = coords[0] || '';
        document.getElementById('edit-library-wifi').checked = properties.Wifi || false;
        document.getElementById('edit-library-phongdoc').checked = properties.PhongDoc || false;
        document.getElementById('edit-library-canteen').checked = properties.Canteen || false;
        document.getElementById('edit-library-dieuhoa').checked = properties.DieuHoa || false;
        
        // Cleanup modals trước khi mở modal mới
        cleanupStuckModals();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById("editLibraryModal"));
        modal.show();
        
        console.log("✅ Form chỉnh sửa đã được mở");
        
    } catch (error) {
        console.error("❌ Lỗi khi mở form chỉnh sửa:", error);
        showAdminError("Không thể mở form chỉnh sửa!");
    }
}

function saveLibraryChanges() {
    try {
        if (!currentEditingLibrary) {
            showAdminError("Không có thư viện nào đang được chỉnh sửa!");
            return;
        }
        
        console.log("💾 Đang lưu thay đổi thư viện...");
        
        // Get form data
        const name = document.getElementById('edit-library-name').value;
        const type = document.getElementById('edit-library-type').value;
        const address = document.getElementById('edit-library-address').value;
        const lat = parseFloat(document.getElementById('edit-library-lat').value);
        const lng = parseFloat(document.getElementById('edit-library-lng').value);
        const wifi = document.getElementById('edit-library-wifi').checked;
        const phongdoc = document.getElementById('edit-library-phongdoc').checked;
        const canteen = document.getElementById('edit-library-canteen').checked;
        const dieuhoa = document.getElementById('edit-library-dieuhoa').checked;
        
        // Validate data
        if (!name || !address || isNaN(lat) || isNaN(lng)) {
            showAdminError("Vui lòng điền đầy đủ thông tin!");
            return;
        }
        
        // Gọi API lưu DB (thử nhiều endpoint để tương thích cấu hình mount)
        const id = currentEditingLibrary.properties.ID;

        const payload = {
            ten_thuvien: name,
            dia_chi: address,
            phanloai: type,
            wifi,
            phongdoc,
            canteen,
            dieuhoa,
            latitude: lat,
            longitude: lng
        };

        const endpoints = [
            `/admin/thu_vien/update-json/${id}`,
            `/thu_vien/update-json/${id}`,
            `/update-json/${id}`,
            `${window.location.origin}/admin/thu_vien/update-json/${id}`
        ];

        function tryUpdate(endpointsList) {
            const [endpoint, ...rest] = endpointsList;
            if (!endpoint) return Promise.reject(new Error('Route not found'));
            return fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    if (res.status === 404) {
                        console.warn('Endpoint 404, thử endpoint khác:', endpoint);
                        return tryUpdate(rest);
                    }
                    throw new Error(`HTTP ${res.status}: ${text}`);
                }
                return res.json();
            });
        }

        tryUpdate(endpoints)
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Cập nhật thất bại');

            // Cập nhật local state theo DB
            currentEditingLibrary.properties.TenThuVien = data.library.ten_thuvien;
            currentEditingLibrary.properties.phanloai = data.library.phanloai;
            currentEditingLibrary.properties.DiaChi = data.library.dia_chi;
            currentEditingLibrary.properties.Wifi = data.library.wifi;
            currentEditingLibrary.properties.PhongDoc = data.library.phongdoc;
            currentEditingLibrary.properties.Canteen = data.library.canteen;
            currentEditingLibrary.properties.DieuHoa = data.library.dieuhoa;
            currentEditingLibrary.geometry.coordinates = [data.library.longitude, data.library.latitude];

            // Render lại markers
            loadAdminLibraries();

            // Đóng modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editLibraryModal'));
            if (modal) modal.hide();
            setTimeout(() => cleanupStuckModals(), 300);

            showAdminSuccess('Đã cập nhật thư viện thành công!');
        })
        .catch(err => {
            console.error('❌ Lỗi cập nhật thư viện:', err);
            showAdminError('Không thể cập nhật: ' + err.message);
        });
        
    } catch (error) {
        console.error("❌ Lỗi khi lưu thay đổi:", error);
        showAdminError("Không thể lưu thay đổi!");
    }
}

// Update Statistics
function updateStatistics() {
    try {
        console.log("📊 Đang cập nhật thống kê...");
        
        let totalBooks = 0;
        let totalLibraries = adminLibrariesData.length;
        let totalCategories = new Set();
        
        adminLibrariesData.forEach(library => {
            if (library.properties.Sachs && library.properties.Sachs.length > 0) {
                library.properties.Sachs.forEach(book => {
                    totalBooks++;
                    if (book.TheLoai) {
                        totalCategories.add(book.TheLoai);
                    }
                });
            }
        });
        
        // Update stats display
        const totalLibrariesEl = document.getElementById('total-libraries');
        const totalBooksEl = document.getElementById('total-books');
        const totalCategoriesEl = document.getElementById('total-categories');
        
        if (totalLibrariesEl) totalLibrariesEl.textContent = totalLibraries;
        if (totalBooksEl) totalBooksEl.textContent = totalBooks;
        if (totalCategoriesEl) totalCategoriesEl.textContent = totalCategories.size;
        
        console.log("✅ Đã cập nhật thống kê");
        
    } catch (error) {
        console.error("❌ Lỗi khi cập nhật thống kê:", error);
    }
}

// Admin Search Function
function performAdminSearch() {
    try {
        const searchQuery = document.getElementById("admin-main-search").value.trim();
        
        if (!searchQuery) {
            showAdminSuccess("Vui lòng nhập từ khóa tìm kiếm!");
            return;
        }

        console.log(`🔍 Admin đang tìm kiếm: ${searchQuery}`);
        
        // Filter libraries based on search query
        const filteredLibraries = adminLibrariesData.filter(library => {
            const properties = library.properties;
            const searchLower = searchQuery.toLowerCase();
            
            return (
                properties.TenThuVien.toLowerCase().includes(searchLower) ||
                properties.DiaChi.toLowerCase().includes(searchLower) ||
                (properties.phanloai && properties.phanloai.toLowerCase().includes(searchLower)) ||
                (properties.Sachs && properties.Sachs.some(book => 
                    book.TenSach && book.TenSach.toLowerCase().includes(searchLower)
                ))
            );
        });

        if (filteredLibraries.length > 0) {
            renderAdminLibraries(filteredLibraries);
            showAdminSuccess(`Tìm thấy ${filteredLibraries.length} thư viện phù hợp!`);
        } else {
            showAdminSuccess("Không tìm thấy thư viện nào phù hợp!");
        }
    } catch (error) {
        console.error("❌ Lỗi khi tìm kiếm:", error);
        showAdminError("Lỗi khi tìm kiếm!");
    }
}

// Find Nearest Libraries
function findNearestLibraries() {
    if (!adminCurrentLocationMarker) {
        showAdminSuccess("Vui lòng xác định vị trí của bạn trước!");
        return;
    }

    const currentLat = adminCurrentLocationMarker.getLatLng().lat;
    const currentLng = adminCurrentLocationMarker.getLatLng().lng;

    // Calculate distances and sort
    const librariesWithDistance = adminLibrariesData.map(library => {
        const coords = library.geometry.coordinates;
        const distance = calculateDistance(currentLat, currentLng, coords[1], coords[0]);
        return { ...library, distance };
    }).sort((a, b) => a.distance - b.distance);

    // Show top 5 nearest
    const nearestLibraries = librariesWithDistance.slice(0, 5);
    renderAdminLibraries(nearestLibraries);
    
    showAdminSuccess(`Đã tìm thấy ${nearestLibraries.length} thư viện gần nhất!`);
}

// Calculate Distance (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Restore Map View
function restoreMapView() {
    try {
        console.log("🔄 Đang khôi phục view map...");
        
        if (adminLibrariesData.length > 0) {
            renderAdminLibraries(adminLibrariesData);
            showAdminSuccess("Đã khôi phục tất cả thư viện!");
        }
        
        // Reset zoom và center về mặc định
        if (adminMap) {
            adminMap.setView(adminMapConfig.center, adminMapConfig.zoom);
        }
        
    } catch (error) {
        console.error("❌ Lỗi khi khôi phục map view:", error);
        showAdminError("Không thể khôi phục map view!");
    }
}

// Get Admin Location
function getAdminLocation() {
    try {
        if (!navigator.geolocation) {
            showAdminSuccess("Trình duyệt không hỗ trợ định vị!");
            return;
        }

        if (!adminMap || !adminMap.getContainer()) {
            showAdminError("Map chưa sẵn sàng, vui lòng đợi!");
            return;
        }

        showAdminSuccess("Đang xác định vị trí...");
        console.log("📍 Bắt đầu xác định vị trí...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    console.log("📍 Vị trí được xác định:", { latitude, longitude });

                    // Remove existing location marker
                    if (adminCurrentLocationMarker && adminMap) {
                        try {
                            adminMap.removeLayer(adminCurrentLocationMarker);
                        } catch (e) {
                            console.warn("⚠️ Không thể xóa marker cũ:", e);
                        }
                    }

                    // Create location icon
                    let locationIcon;
                    try {
                        locationIcon = L.icon({
                            iconUrl: "/images/diem.jpg",
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });
                    } catch (e) {
                        console.warn("⚠️ Sử dụng icon mặc định:", e);
                        locationIcon = L.divIcon({
                            className: 'custom-div-icon',
                            html: '<div style="background-color: #ff4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                    }

                    // Add location marker
                    adminCurrentLocationMarker = L.marker([latitude, longitude], {
                        icon: locationIcon,
                        zIndexOffset: 1000
                    }).addTo(adminMap);
                    
                    // Bind popup
                    try {
                        adminCurrentLocationMarker.bindPopup("📍 Vị trí của bạn").openPopup();
                    } catch (e) {
                        console.warn("⚠️ Không thể mở popup:", e);
                    }

                    // Move map to location
                    try {
                        adminMap.setView([latitude, longitude], 16, {
                            animate: true,
                            duration: 1.0
                        });
                    } catch (e) {
                        console.warn("⚠️ Không thể di chuyển map:", e);
                        adminMap.setView([latitude, longitude], 16);
                    }

                    showAdminSuccess("Đã xác định vị trí của bạn!");
                    console.log("✅ Vị trí đã được xác định thành công");

                } catch (error) {
                    console.error("❌ Lỗi khi xử lý vị trí:", error);
                    showAdminError("Lỗi khi xử lý vị trí: " + error.message);
                }
            },
            (error) => {
                console.error("❌ Lỗi khi lấy vị trí:", error);
                let errorMessage = "Không thể lấy vị trí";
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Bạn đã từ chối quyền truy cập vị trí";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Thông tin vị trí không khả dụng";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Hết thời gian chờ lấy vị trí";
                        break;
                    default:
                        errorMessage = "Lỗi không xác định: " + error.message;
                }
                
                showAdminError(errorMessage);
            },
            {
                enableHighAccuracy: false,
                timeout: 8000,
                maximumAge: 30000
            }
        );
    } catch (error) {
        console.error("❌ Lỗi trong getAdminLocation:", error);
        showAdminError("Lỗi khi khởi tạo định vị: " + error.message);
    }
}

// Toggle Admin Fullscreen
function toggleAdminFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error("Lỗi khi vào chế độ toàn màn hình:", err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Export Admin Data
function exportAdminData() {
    try {
        const dataStr = JSON.stringify(adminLibrariesData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'thu-vien-data.json';
        link.click();
        URL.revokeObjectURL(url);
        
        showAdminSuccess("Đã xuất dữ liệu thành công!");
    } catch (error) {
        console.error("Lỗi khi xuất dữ liệu:", error);
        showAdminError("Không thể xuất dữ liệu!");
    }
}

// Apply Admin Filters
function applyAdminFilters() {
    const wifiFilter = document.getElementById("admin-filter-wifi").checked;
    const phongDocFilter = document.getElementById("admin-filter-phong-doc").checked;
    const canteenFilter = document.getElementById("admin-filter-canteen").checked;
    const dieuHoaFilter = document.getElementById("admin-filter-dieu-hoa").checked;
    const phanLoaiFilter = document.getElementById("admin-filter-phanloai").value;
    const genreFilter = document.getElementById("admin-filter-genre").value.trim();

    let filteredLibraries = adminLibrariesData;

    // Apply utility filters
    if (wifiFilter || phongDocFilter || canteenFilter || dieuHoaFilter) {
        filteredLibraries = filteredLibraries.filter(library => {
            const properties = library.properties;
            if (wifiFilter && !properties.Wifi) return false;
            if (phongDocFilter && !properties.PhongDoc) return false;
            if (canteenFilter && !properties.Canteen) return false;
            if (dieuHoaFilter && !properties.DieuHoa) return false;
            return true;
        });
    }

    // Apply type filter
    if (phanLoaiFilter) {
        filteredLibraries = filteredLibraries.filter(library => 
            library.properties.phanloai === phanLoaiFilter
        );
    }

    // Apply genre filter
    if (genreFilter) {
        filteredLibraries = filteredLibraries.filter(library => 
            library.properties.Sachs && library.properties.Sachs.some(book => 
                book.TheLoai && book.TheLoai.toLowerCase().includes(genreFilter.toLowerCase())
            )
        );
    }

    renderAdminLibraries(filteredLibraries);
    showAdminSuccess(`Đã lọc: ${filteredLibraries.length} thư viện phù hợp!`);
    
    // Close modal và cleanup
    const modal = bootstrap.Modal.getInstance(document.getElementById("adminFilterModal"));
    if (modal) {
        modal.hide();
    }
    
    // Cleanup modal backdrop sau khi đóng
    setTimeout(() => {
        cleanupStuckModals();
    }, 300);
}

// Reset Admin Filters
function resetAdminFilters() {
    // Reset checkboxes
    document.getElementById("admin-filter-wifi").checked = false;
    document.getElementById("admin-filter-phong-doc").checked = false;
    document.getElementById("admin-filter-canteen").checked = false;
    document.getElementById("admin-filter-dieu-hoa").checked = false;
    
    // Reset selects and inputs
    document.getElementById("admin-filter-phanloai").value = "";
    document.getElementById("admin-filter-genre").value = "";
    
    // Restore all libraries
    renderAdminLibraries(adminLibrariesData);
    showAdminSuccess("Đã đặt lại bộ lọc!");
}

// Load Admin Libraries List
async function loadAdminLibrariesList() {
    const contentDiv = document.getElementById("admin-libraries-content");
    if (!contentDiv) return;

    contentDiv.innerHTML = `
        <div class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Đang tải danh sách thư viện...</p>
        </div>
    `;

    try {
        if (adminLibrariesData.length === 0) {
            await loadAdminLibraries();
        }

        renderAdminLibrariesList(adminLibrariesData);
    } catch (error) {
        console.error("Lỗi khi tải danh sách thư viện:", error);
        contentDiv.innerHTML = `
            <div class="text-center p-4">
                <p>❌ Không thể tải danh sách thư viện</p>
                <button class="btn btn-primary" onclick="loadAdminLibrariesList()">
                    Thử lại
                </button>
            </div>
        `;
    }
}

// Render Admin Libraries List
function renderAdminLibrariesList(libraries) {
    const contentDiv = document.getElementById("admin-libraries-content");
    if (!contentDiv) return;

    if (libraries.length === 0) {
        contentDiv.innerHTML = `
            <div class="text-center p-4">
                <p>Không có thư viện nào</p>
            </div>
        `;
        return;
    }

    const librariesHTML = libraries.map(library => {
        const properties = library.properties;
        const coords = library.geometry.coordinates;
        
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">${properties.TenThuVien}</h6>
                            <p class="card-text mb-1">
                                <i class="bi bi-geo-alt text-success me-2"></i>${properties.DiaChi}
                            </p>
                            <p class="card-text mb-1">
                                <i class="bi bi-tag text-primary me-2"></i>${properties.phanloai || "Không xác định"}
                            </p>
                            <p class="card-text mb-2">
                                <i class="bi bi-book text-info me-2"></i>${properties.Sachs ? properties.Sachs.length : 0} sách
                            </p>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">ID: ${properties.ID}</small><br>
                            <button class="btn btn-sm btn-outline-primary mt-1" onclick="focusOnLibrary(${coords[1]}, ${coords[0]})">
                                <i class="bi bi-eye"></i> Xem
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    contentDiv.innerHTML = librariesHTML;
}

// Filter Admin Libraries
function filterAdminLibraries() {
    const searchQuery = document.getElementById("admin-library-search").value.toLowerCase();
    const typeFilter = document.getElementById("admin-library-type-filter").value;

    let filteredLibraries = adminLibrariesData;

    // Apply search filter
    if (searchQuery) {
        filteredLibraries = filteredLibraries.filter(library => 
            library.properties.TenThuVien.toLowerCase().includes(searchQuery) ||
            library.properties.DiaChi.toLowerCase().includes(searchQuery)
        );
    }

    // Apply type filter
    if (typeFilter) {
        filteredLibraries = filteredLibraries.filter(library => 
            library.properties.phanloai === typeFilter
        );
    }

    renderAdminLibrariesList(filteredLibraries);
}

// Highlight Library on Map
function highlightAdminLibrary(marker) {
    // Remove previous highlights
    adminMarkers.forEach(m => {
        m.setIcon(L.icon({
            iconUrl: "/images/igel.png",
            iconSize: [60, 60],
            iconAnchor: [30, 60],
            popupAnchor: [0, -50]
        }));
    });

    // Highlight selected marker
    marker.setIcon(L.icon({
        iconUrl: "/images/igel.png",
        iconSize: [70, 70],
        iconAnchor: [35, 70],
        popupAnchor: [0, -60]
    }));

    // Center map on marker
    adminMap.setView(marker.getLatLng(), 16);
}

// Focus on Library
function focusOnLibrary(lat, lng) {
    adminMap.setView([lat, lng], 16);
    
    // Find and highlight marker
    const marker = adminMarkers.find(m => {
        const pos = m.getLatLng();
        return Math.abs(pos.lat - lat) < 0.001 && Math.abs(pos.lng - lng) < 0.001;
    });
    
    if (marker) {
        highlightAdminLibrary(marker);
        marker.openPopup();
    }
}

// Show Admin Success Message
function showAdminSuccess(message) {
    const modal = document.getElementById("adminSuccessModal");
    const messageElement = document.getElementById("admin-success-message");
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Auto cleanup sau khi hiển thị success modal
        setTimeout(() => {
            cleanupStuckModals();
        }, 1000);
    } else {
        // Fallback alert
        alert("✅ " + message);
    }
}

// Show Admin Error Message
function showAdminError(message) {
    console.error("❌ Admin Error:", message);
    // Fallback alert
    alert("❌ " + message);
}

// Global functions for popup actions
window.showAdminDirections = function(lat, lng, libraryName) {
    if (adminCurrentLocationMarker) {
        const currentLat = adminCurrentLocationMarker.getLatLng().lat;
        const currentLng = adminCurrentLocationMarker.getLatLng().lng;
        const directionsUrl = `https://www.google.com/maps/dir/${currentLat},${currentLng}/${lat},${lng}`;
        window.open(directionsUrl, "_blank");
        showAdminSuccess(`Đang mở Google Maps để chỉ đường đến ${libraryName}!`);
    } else {
        showAdminSuccess("Vui lòng xác định vị trí của bạn trước!");
    }
};

window.viewAdminLibraryDetails = function(libraryId) {
    showAdminSuccess(`Xem chi tiết thư viện ID: ${libraryId}`);
    // Redirect to details page
    window.location.href = `/admin/thu_vien/view/${libraryId}`;
};

// Export functions to global scope
window.editLibraryOnMap = editLibraryOnMap;
window.saveLibraryChanges = saveLibraryChanges;
window.focusOnLibrary = focusOnLibrary;
window.cleanupStuckModals = cleanupStuckModals;
window.forceCleanupAllModals = forceCleanupAllModals;

console.log("🎯 Admin Map JavaScript đã được khởi tạo hoàn chỉnh với modal cleanup!");