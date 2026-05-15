-- ==============================================================================
-- 0. LIMPEZA TOTAL (Sintaxe SQLite)
-- ==============================================================================
DROP TABLE IF EXISTS alertas;
DROP TABLE IF EXISTS leituras;
DROP TABLE IF EXISTS limites_sensores;
DROP TABLE IF EXISTS tipos_sensor;
DROP TABLE IF EXISTS boias;
DROP TABLE IF EXISTS zonas;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS empresas;

-- ==============================================================================
-- 1. CRIAÇÃO DAS TABELAS COM ISOLAMENTO
-- ==============================================================================

CREATE TABLE empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(255) NOT NULL UNIQUE,
    nif VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'leitor_empresa', -- 'super_admin', 'admin_empresa', 'tecnico_empresa', 'leitor_empresa'
    empresa_id INTEGER NULL,                    -- NULL apenas para o Super Admin Global
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE zonas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(255) NOT NULL,
    concelho VARCHAR(255) NOT NULL,
    descricao TEXT,
    empresa_id INTEGER NOT NULL,               -- Cada empresa tem o seu próprio registo de zona
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE boias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_boia VARCHAR(100) NOT NULL UNIQUE,      
    mac_gateway VARCHAR(100) NULL,              
    nome VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    zona_id INTEGER NOT NULL,
    localizacao_texto VARCHAR(255) NULL,
    estado VARCHAR(50) DEFAULT 'ativa',
    bateria INTEGER DEFAULT 100,
    FOREIGN KEY (zona_id) REFERENCES zonas(id) ON DELETE CASCADE
);

CREATE TABLE tipos_sensor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL,
    unidade VARCHAR(50) NOT NULL
);

CREATE TABLE limites_sensores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boia_id INTEGER NOT NULL,
    tipo_sensor_id INTEGER NOT NULL,
    valor_minimo DECIMAL(8, 2) NOT NULL,
    valor_maximo DECIMAL(8, 2) NOT NULL,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_sensor_id) REFERENCES tipos_sensor(id) ON DELETE CASCADE
);

CREATE TABLE leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boia_id INTEGER NOT NULL,
    tipo_sensor_id INTEGER NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_sensor_id) REFERENCES tipos_sensor(id) ON DELETE CASCADE
);

CREATE TABLE alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leitura_id INTEGER NOT NULL,
    boia_id INTEGER NOT NULL,
    gravidade VARCHAR(50) NOT NULL,
    descricao TEXT NOT NULL,
    resolvido INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leitura_id) REFERENCES leituras(id) ON DELETE CASCADE,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE
);

-- ==============================================================================
-- 2. INSERÇÃO DE DADOS DE TESTE (Password padrão: 'password123')
-- ==============================================================================

-- Criar duas empresas diferentes
INSERT INTO empresas (nome, nif) VALUES 
('SMAS Leiria', '500123456'),
('Fábrica de Papel do Lis', '500987654');

-- Criar utilizadores com cargos diferentes
INSERT INTO users (name, email, password, role, empresa_id) VALUES 
('Super Admin Global', 'admin@hidrobox.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', NULL),
('Bernardo Admin SMAS', 'admin@smas-leiria.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin_empresa', 1),
('Técnico Papelaria', 'tecnico@papellis.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tecnico_empresa', 2);

-- Duas zonas com o mesmo nome teórico, mas registos e donos totalmente diferentes!
INSERT INTO zonas (nome, concelho, descricao, empresa_id) VALUES 
('Rio Lis - Setor Público', 'Leiria', 'Água pública monitorizada pelos SMAS', 1), -- ID 1
('Rio Lis - Setor Industrial', 'Leiria', 'Captação de água da Fábrica', 2);      -- ID 2

-- Boia da Empresa 1 (SMAS)
INSERT INTO boias (mac_boia, mac_gateway, nome, latitude, longitude, zona_id, localizacao_texto, estado, bateria) VALUES 
('24:6F:28:A1:B2:C3', '32:AE:A4:05:C1:FE', 'Boia Captação SMAS', 39.7436, -8.8070, 1, 'Ponte Pública', 'ativa', 90);

-- Boia da Empresa 2 (Fábrica)
INSERT INTO boias (mac_boia, mac_gateway, nome, latitude, longitude, zona_id, localizacao_texto, estado, bateria) VALUES 
('AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 'Boia Descarga Fábrica', 39.7500, -8.8100, 2, 'Tubo de Saída Privado', 'ativa', 95);

-- Tipos de Sensores Globais
INSERT INTO tipos_sensor (nome, unidade) VALUES 
('Oxigénio Dissolvido', 'mg/L'),
('pH', 'pH'),
('Temperatura', '180°C');

-- Associar o sensor de pH (ID 2) à Boia dos SMAS (ID 1)
INSERT INTO limites_sensores (boia_id, tipo_sensor_id, valor_minimo, valor_maximo) VALUES 
(1, 2, 6.50, 8.50);