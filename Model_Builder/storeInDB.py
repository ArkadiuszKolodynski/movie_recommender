import mysql.connector
from datetime import datetime


fname = "hetrec2011-movielens-2k-v2/user_ratedmovies-timestamps.dat"

with open(fname) as f:
    content = f.readlines()

content = [x.strip() for x in content]
content = content[1:]

mydb = mysql.connector.connect(
  host="localhost",
  user="movielensuser",
  passwd="movielenspass",
  database="movielens"
)

mycursor = mydb.cursor()

sql = "INSERT INTO user_ratedmovies_timestamps VALUES (%s, %s, %s, %s)"

for line in content:
    line = line.split("\t")

    ts = float(line[3]) / 1000
    try:
        pline = [int(line[0]), int(line[1]), float(line[2]), datetime.fromtimestamp(ts)]
    except:
        continue
    mycursor.execute(sql, tuple(pline))

mydb.commit()

print(mycursor.rowcount, "records inserted.")
