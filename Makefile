s3: prod
	aws s3 sync ./dist/ s3://grad.naitian.org/

prod:
	parcel build src/index.html
