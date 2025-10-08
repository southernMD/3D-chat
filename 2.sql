-- 设置客户端字符集
SET NAMES utf8mb4;

-- 先建被引用的表：users, static_resource_path
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `nickname` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `verify` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `static_resource_path` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hash` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `path` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `ext` enum('.glb','.gltf','.pmx','.vmd','.png','.jpg','.jpeg') NOT NULL,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash-path-index` (`hash`,`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 建依赖 users 的表：equipment
CREATE TABLE `equipment` (
  `id` int(11) NOT NULL,
  `egg` bigint(20) DEFAULT NULL,
  KEY `fk_equipment_users_1` (`id`),
  CONSTRAINT `fk_equipment_users_1` FOREIGN KEY (`id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 建依赖 users 和 static_resource_path 的表：static_resource_message
CREATE TABLE `static_resource_message` (
  `hash` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `size` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `picPath` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `des` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `createrId` int(11) NOT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `name` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hash_index` (`hash`),
  KEY `FK_521b637afd29052b3066fa7e2bc` (`createrId`),
  CONSTRAINT `FK_521b637afd29052b3066fa7e2bc` FOREIGN KEY (`createrId`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_8ff8076d50953b6487a15dc3ce9` FOREIGN KEY (`hash`) REFERENCES `static_resource_path` (`hash`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 创建 verification_codes 表
CREATE TABLE `verification_codes` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '验证码ID，主键',
  `email` varchar(100) CHARACTER SET utf8mb4 DEFAULT NULL COMMENT '邮箱地址',
  `code` varchar(10) CHARACTER SET utf8mb4 NOT NULL COMMENT '验证码',
  `expire_time` datetime NOT NULL COMMENT '过期时间',
  `is_used` tinyint(4) NOT NULL DEFAULT '0' COMMENT '是否已使用：0-未使用，1-已使用',
  `create_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `update_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 触发器示例（保持原样，创建 equipment egg 初始值）
DELIMITER ;;
CREATE TRIGGER trg_after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO equipment (id, egg) VALUES (NEW.id, 0);
END;;
DELIMITER ;
