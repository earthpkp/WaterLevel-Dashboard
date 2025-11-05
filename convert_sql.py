"""
Script to convert SQLite-style SQL to MySQL-compatible SQL
แปลง SQL จาก SQLite format เป็น MySQL format
"""

import re
import sys

def convert_sql_to_mysql(input_file, output_file):
    """
    Convert SQLite SQL to MySQL compatible SQL
    """
    print(f"Reading {input_file}...")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File {input_file} not found!")
        return False
    
    print("Converting SQL syntax...")
    
    # Remove BEGIN; statement
    content = re.sub(r'BEGIN;\s*--.*\n', '', content)
    
    # Add USE database statement at the beginning
    mysql_content = "-- MySQL compatible script\nUSE waterlevel_db;\n\n"
    
    # Replace double quotes with backticks for identifiers, single quotes for values
    # Replace "table_name" with `table_name`
    content = re.sub(r'CREATE TABLE IF NOT EXISTS "(\w+)"', r'CREATE TABLE IF NOT EXISTS `\1`', content)
    
    # Replace column names in CREATE TABLE
    content = re.sub(r'"(\w+)" (TEXT|REAL|TIMESTAMP)', lambda m: f"`{m.group(1)}` {convert_type(m.group(2))}", content)
    
    # Replace INSERT INTO statements
    content = re.sub(r'INSERT INTO "(\w+)"', r'INSERT INTO `\1`', content)
    content = re.sub(r'\("(\w+)"', r'(`\1`', content)
    content = re.sub(r', "(\w+)"', r', `\1`', content)
    
    # Add PRIMARY KEY and indexes
    content = content.replace(
        'CREATE TABLE IF NOT EXISTS `metadata_kolok_waterlevel` (',
        'CREATE TABLE IF NOT EXISTS `metadata_kolok_waterlevel` (\n  `id` INT AUTO_INCREMENT PRIMARY KEY,'
    )
    
    content = content.replace(
        'CREATE TABLE IF NOT EXISTS `waterlevel_data` (',
        'CREATE TABLE IF NOT EXISTS `waterlevel_data` (\n  `id` INT AUTO_INCREMENT PRIMARY KEY,'
    )
    
    # Add ENGINE and CHARSET
    content = re.sub(r'\);', ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;', content)
    
    mysql_content += content
    
    # Remove COMMIT if exists
    mysql_content = mysql_content.replace('COMMIT;', '')
    
    print(f"Writing to {output_file}...")
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(mysql_content)
        print("✅ Conversion completed successfully!")
        print(f"Output file: {output_file}")
        return True
    except Exception as e:
        print(f"Error writing file: {e}")
        return False

def convert_type(sqlite_type):
    """
    Convert SQLite data types to MySQL data types
    """
    type_mapping = {
        'TEXT': 'VARCHAR(255)',
        'REAL': 'DECIMAL(10, 2)',
        'TIMESTAMP': 'DATETIME'
    }
    return type_mapping.get(sqlite_type, sqlite_type)

if __name__ == "__main__":
    input_file = "kolok_waterlevel.sql"
    output_file = "kolok_waterlevel_mysql.sql"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    print("=" * 50)
    print("SQL Converter: SQLite to MySQL")
    print("=" * 50)
    print()
    
    success = convert_sql_to_mysql(input_file, output_file)
    
    if success:
        print()
        print("Next steps:")
        print("1. Review the converted SQL file")
        print("2. Update docker-compose.yml to use the new file:")
        print(f"   - ./{output_file}:/docker-entrypoint-initdb.d/init.sql")
        print("3. Restart Docker containers:")
        print("   docker-compose down -v && docker-compose up -d")
    
    sys.exit(0 if success else 1)
