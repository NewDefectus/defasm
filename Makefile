build:
	docker build -t defasm/cli .
	docker inspect -f "{{ .Size }}" defasm/cli
run:
	docker run --rm -i defasm/cli -r