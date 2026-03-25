-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` ENUM('superadmin', 'admin', 'operador') NOT NULL DEFAULT 'operador',

    UNIQUE INDEX `usuarios_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lineas_produccion` (
    `id_linea` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `opcua_url` VARCHAR(191) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `limite_reprocesos` INTEGER NOT NULL DEFAULT 3,

    UNIQUE INDEX `lineas_produccion_nombre_key`(`nombre`),
    PRIMARY KEY (`id_linea`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lotes` (
    `id_lote` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_lote` VARCHAR(191) NOT NULL,
    `id_linea` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'ACTIVO', 'FINALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lotes_nombre_lote_key`(`nombre_lote`),
    PRIMARY KEY (`id_lote`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estaciones` (
    `id_estacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_linea` INTEGER NOT NULL,
    `nombre_estacion` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `trigger_node_id` VARCHAR(191) NULL,
    `serie_node_id` VARCHAR(191) NULL,

    UNIQUE INDEX `estaciones_id_linea_nombre_estacion_key`(`id_linea`, `nombre_estacion`),
    PRIMARY KEY (`id_estacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parametros` (
    `id_parametro` INTEGER NOT NULL AUTO_INCREMENT,
    `id_estacion` INTEGER NOT NULL,
    `nombre_parametro` VARCHAR(191) NOT NULL,
    `tipo` ENUM('numerico', 'texto', 'booleano') NOT NULL,
    `direccion_opc_ua` VARCHAR(191) NOT NULL,
    `valor_min` DECIMAL(10, 2) NULL,
    `valor_max` DECIMAL(10, 2) NULL,
    `valor_booleano_ok` BOOLEAN NULL,

    UNIQUE INDEX `parametros_direccion_opc_ua_key`(`direccion_opc_ua`),
    PRIMARY KEY (`id_parametro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `id_lote` INTEGER NOT NULL,
    `numero_serie` VARCHAR(191) NOT NULL,
    `estado` ENUM('EN_PROCESO', 'COMPLETADO', 'DESCARTADO', 'REPROCESO') NOT NULL DEFAULT 'EN_PROCESO',
    `conteo_reprocesos` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `productos_numero_serie_key`(`numero_serie`),
    PRIMARY KEY (`id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros` (
    `id_registro` INTEGER NOT NULL AUTO_INCREMENT,
    `id_producto` INTEGER NOT NULL,
    `id_estacion` INTEGER NOT NULL,
    `id_parametro` INTEGER NOT NULL,
    `valor_reportado` VARCHAR(191) NULL,
    `resultado` ENUM('OK', 'NO_OK', 'REPROCESO', 'DESCARTADO') NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `año` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `dia` INTEGER NOT NULL,

    INDEX `registros_id_producto_idx`(`id_producto`),
    INDEX `registros_id_estacion_idx`(`id_estacion`),
    INDEX `registros_año_mes_dia_idx`(`año`, `mes`, `dia`),
    PRIMARY KEY (`id_registro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lotes` ADD CONSTRAINT `lotes_id_linea_fkey` FOREIGN KEY (`id_linea`) REFERENCES `lineas_produccion`(`id_linea`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estaciones` ADD CONSTRAINT `estaciones_id_linea_fkey` FOREIGN KEY (`id_linea`) REFERENCES `lineas_produccion`(`id_linea`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parametros` ADD CONSTRAINT `parametros_id_estacion_fkey` FOREIGN KEY (`id_estacion`) REFERENCES `estaciones`(`id_estacion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_id_lote_fkey` FOREIGN KEY (`id_lote`) REFERENCES `lotes`(`id_lote`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros` ADD CONSTRAINT `registros_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `productos`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros` ADD CONSTRAINT `registros_id_estacion_fkey` FOREIGN KEY (`id_estacion`) REFERENCES `estaciones`(`id_estacion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros` ADD CONSTRAINT `registros_id_parametro_fkey` FOREIGN KEY (`id_parametro`) REFERENCES `parametros`(`id_parametro`) ON DELETE CASCADE ON UPDATE CASCADE;
