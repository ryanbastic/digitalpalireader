run:
	go run ./cmd/dpr

build:
	docker build --no-cache -t digitalpalireader .

push:
	#docker tag digitalpalireader digitalpalireader:release
	#docker push digitalpalireader:release
	docker tag digitalpalireader rbastic/digitalpalireader:release
	docker push rbastic/digitalpalireader:release
