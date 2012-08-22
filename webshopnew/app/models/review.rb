class Review < ActiveRecord::Base
  attr_accessible :description, :rating, :summary
end
