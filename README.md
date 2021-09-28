
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

---

# Azure Migration
based on [https://docs.microsoft.com/en-us/azure/dms/tutorial-mysql-azure-mysql-offline-portal](https://docs.microsoft.com/en-us/azure/dms/tutorial-mysql-azure-mysql-offline-portal)

Create a temporary user to replicate data between two server and grant permission to replication only
```sql
CREATE USER 'replicator'@'%' IDENTIFIED BY '64EG!cYEK@*hah';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%' IDENTIFIED BY '64EG!cYEK@*hah';
```

get the original database data by exporting it

```sh
mysqldump --master-data --databases -u root -p dbaname > _export.sql

```

> note the flag `--master-data` will append the current <master_log_pos> and <master_log_file>

import the master database data into the new server, you can also use the GUI to import the file

```bash
mysql --user=root --password=P9kmYEStg8Y5kCvc sys < _export.sql
```
> note the database `sys` has been chosen because the flag `--database` used by the `mysqldump` includes instruction to create a new schema

verify if the data import was successful. If so the next is to sync the replica with master

```sql
CALL mysql.az_replication_change_master('<master_host>', '<master_user>', '<master_password>', <master_port>, '<master_log_file>', <master_log_pos>, '<master_ssl_ca>');

```
- **<master_host>**: hostname of the source server
- **<master_user>**: username for the source server
- **<master_password>**: password for the source server
- **<master_port>**: port number on which source server is listening for connections. (3306 is the default port on which MySQL is listening)
- **<master_log_file>**: binary log file name from running show master status
- **<master_log_pos>**: binary log position from running show master status
- **<master_ssl_ca>**: CA certificate's context. If not using SSL, pass in empty string.

After the replica has set the master with server information, start replication by calling the procedure

```sql
CALL mysql.az_replication_start;
```

verify if the replication is working as expected by calling

```sql
SHOW SLAVE STATUS;
```

Check the columns `last_sql_error`, `slave_io_master`, `slave_sql_running` and `slave_sql_running_state`

Once the replication is finished
--------------------------------

When both servers are synched up. Update the application to use the replica instead of master. When the deployment is finished, stop the replication


```sql
-- stop the replication agent
CALL mysql.az_replication_stop;

-- break the replication
CALL mysql.az_replication_remove_master;
```