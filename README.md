
# source-replica replication

### main replica

## source server initial DB

```sql
CREATE SCHEMA playground;

USE playground;

-- grant regular user privileges to the regular user
GRANT ALL ON playground.* TO 'abc'@'%' IDENTIFIED BY '123';

CREATE TABLE device (
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	name VARCHAR(50),
	device_type ENUM('mobile', 'tablet', 'desktop')
);

CREATE TABLE beacon (
	id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	device_id INT NOT NULL,
	reported_at TIMESTAMP DEFAULT current_timestamp() ON UPDATE current_timestamp(),
	lat DOUBLE,
	lon DOUBLE,
	battery_level INT NULL,
	FOREIGN KEY (device_id) REFERENCES device (id) ON DELETE CASCADE
);


INSERT INTO device (name, device_type) VALUES
    ('iPhone 13', 'mobile'),
    ('iPad', 'tablet'),
    ('macBook', 'desktop');
```

## source replica user
> Create a temporary user to replicate data between two server and grant permission to replication only
```sql
CREATE USER 'replicator'@'%' IDENTIFIED BY '64EG!cYEK@*hah';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%' IDENTIFIED BY '64EG!cYEK@*hah';
```

## get the current db state (save time and any networking overhead)


```sh
mysqldump -u root -p playground --master-data --databases > _export.sql

# when docker
docker exec -it source mysqldump --master-data --databases --user=root --password=KT9DxUKK2VqFpsA2 playground > _export.sql
```

## import on the replica server
```bash
mysql --user=root --password=P9kmYEStg8Y5kCvc sys < _export.sql

# when docker
docker exec -i replica mysql --user=root --password=P9kmYEStg8Y5kCvc sys < _export.sql
```

## second replica

```sql
CREATE SCHEMA playground;
```
> [note] the master_log_file property and master_log_pos are obtained from the main replica

## on the main replica

```sql
SHOW MASTER STATUS;
```

## on the second replica

```sql
STOP SLAVE;

CHANGE MASTER TO master_host='source', master_port=3301, master_user='replicator', master_password='64EG!cYEK@*hah', master_log_file='mysql-bin.000002', master_log_pos=1530;

START SLAVE;

SHOW SLAVE STATUS;
```
---
## some common docker commands


```bash
# to build and run docker-compose files
docker-compose -f "docker-compose.yml" up -d --build

# to power off and destroy the environment
docker-compose -f "docker-compose.yml" down 

# to sh into a container
docker exec -it $CONTAINER_NAME sh

# lo list running containers
docker ps
```