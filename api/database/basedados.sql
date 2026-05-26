-- ==============================================================================
-- 0. LIMPEZA TOTAL (Ordem reversa para evitar erros de Foreign Key)
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
-- 1. ESTRUTURA CORE (Multi-Tenant)
-- ==============================================================================

-- Tabela de Clientes/Empresas
CREATE TABLE empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(255) NOT NULL UNIQUE,
    nif VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Utilizadores (Hierarquia Global e Local)
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

-- Zonas de Monitorização (Pertencem a uma Empresa)
CREATE TABLE zonas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(255) NOT NULL,
    concelho VARCHAR(255) NOT NULL,
    descricao TEXT,
    empresa_id INTEGER NOT NULL,
    user_id INTEGER NULL, -- Criador/Responsável da zona
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON SET NULL
);

-- Equipamentos (Boias)
CREATE TABLE boias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_boia VARCHAR(100) NOT NULL UNIQUE,      
    mac_gateway VARCHAR(100) NULL,              
    nome VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    zona_id INTEGER NOT NULL,
    localizacao_texto VARCHAR(255) NULL,
    estado VARCHAR(50) DEFAULT 'ativa', -- 'ativa', 'manutencao', 'erro', 'offline'
    bateria INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zona_id) REFERENCES zonas(id) ON DELETE CASCADE
);

-- Catálogo de Parâmetros de Sensores
CREATE TABLE tipos_sensor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome VARCHAR(100) NOT NULL,
    unidade VARCHAR(50) NOT NULL
);

-- Configuração de Limites Alerta por Equipamento
CREATE TABLE limites_sensores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boia_id INTEGER NOT NULL,
    tipo_sensor_id INTEGER NOT NULL,
    valor_minimo DECIMAL(8, 2) NOT NULL,
    valor_maximo DECIMAL(8, 2) NOT NULL,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_sensor_id) REFERENCES tipos_sensor(id) ON DELETE CASCADE
);

-- Registo de Leituras (Big Data)
CREATE TABLE leituras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boia_id INTEGER NOT NULL,
    tipo_sensor_id INTEGER NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_sensor_id) REFERENCES tipos_sensor(id) ON DELETE CASCADE
);

-- Gestão de Alertas e Notificações
CREATE TABLE alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leitura_id INTEGER NOT NULL,
    boia_id INTEGER NOT NULL,
    gravidade VARCHAR(50) NOT NULL, -- 'critico', 'aviso', 'info'
    descricao TEXT NOT NULL,
    resolvido INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leitura_id) REFERENCES leituras(id) ON DELETE CASCADE,
    FOREIGN KEY (boia_id) REFERENCES boias(id) ON DELETE CASCADE
);

-- ==============================================================================
-- 2. DADOS DE TESTE INICIAIS (Password: 'password123' -> $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
-- ==============================================================================

-- Empresas
INSERT INTO empresas (nome, nif) VALUES 
('SMAS Leiria', '500123456'),
('Câmara Municipal de Coimbra', '500777888'),
('Fábrica de Celulose Lis', '500999000');

-- Utilizadores (Hierarquia Global e por Empresa)
INSERT INTO users (name, email, password, role, empresa_id) VALUES 
('Super Administrador', 'super@hidrobox.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', NULL),
('Bernardo Admin SMAS', 'admin@smas-leiria.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin_empresa', 1),
('Ricardo Técnico SMAS', 'tecnico@smas-leiria.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tecnico_empresa', 1),
('Ana Leitora SMAS', 'ana@smas-leiria.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'leitor_empresa', 1),
('Carlos Admin CMC', 'carlos@cm-coimbra.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin_empresa', 2),
('Sofia Técnica Celulose', 'sofia@celulis.pt', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tecnico_empresa', 3);

-- Zonas Geográficas por Empresa
INSERT INTO zonas (nome, concelho, descricao, empresa_id) VALUES 
('Rio Lis - Setor A', 'Leiria', 'Monitorização junto à ponte principal', 1),
('Rio Lis - Setor B', 'Leiria', 'Zona industrial a jusante', 1),
('Rio Mondego - Parque', 'Coimbra', 'Zona de lazer municipal', 2),
('Captação Industrial', 'Leiria', 'Entrada de água da fábrica', 3);

-- Equipamentos (Boias)
INSERT INTO boias (mac_boia, mac_gateway, nome, latitude, longitude, zona_id, localizacao_texto, estado) VALUES 
('24:6F:28:A1:B2:C3', '32:AE:A4:05:C1:FE', 'Boia Central Lis', 39.7436, -8.8070, 1, 'Ponte Tenente Valadim', 'ativa'),
('AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 'Boia Jusante Celulose', 39.7500, -8.8100, 2, 'Descarga Fabril', 'manutencao'),
('BB:CC:DD:EE:FF:11', '22:33:44:55:66:77', 'Boia Mondego Sul', 40.2033, -8.4103, 3, 'Parque Verde', 'ativa');

-- Tipos de Sensores
INSERT INTO tipos_sensor (nome, unidade) VALUES 
('Oxigénio Dissolvido', 'mg/L'),
('pH', 'pH'),
('Temperatura', 'ºC'),
('Condutividade', 'µS/cm'),
('Turbidez', 'NTU'),
('Salinidade', 'psu');

-- Limites de Segurança (Boia Central Lis)
INSERT INTO limites_sensores (boia_id, tipo_sensor_id, valor_minimo, valor_maximo) VALUES 
(1, 1, 5.00, 10.00), -- Oxigénio
(1, 2, 6.50, 8.50),  -- pH
(1, 3, 10.00, 28.00); -- Temperatura

-- Leituras Recentes (Exemplo)
INSERT INTO leituras (boia_id, tipo_sensor_id, valor) VALUES 
(1, 1, 7.50),
(1, 2, 7.20),
(1, 3, 18.50),
(2, 2, 5.80); -- pH baixo na descarga da fábrica (vai gerar alerta)

-- Alertas Gerados
INSERT INTO alertas (leitura_id, boia_id, gravidade, descricao) VALUES 
(4, 2, 'critico', 'pH crítico detetado na zona de descarga (5.80 pH)');
